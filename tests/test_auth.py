"""Проверки безопасности: роли, чужой объект, ротация, подделка и лимит."""

from datetime import date, timedelta
import base64
import json
import pytest
from app.core.security import create_token


def test_registration_login_refresh_logout(db_client):
    db_client.headers.pop("Authorization", None)
    payload = {"email": "alice@example.com", "password": "BookNest123"}
    registered = db_client.post("/auth/register", json=payload)
    assert registered.status_code == 201, registered.text
    assert "password_hash" not in registered.json()
    assert registered.json()["role"] == "member"
    assert db_client.post("/auth/register", json=payload).status_code == 409
    assert (
        db_client.post(
            "/auth/register", json={"email": "other@example.com", "password": "abcdefgh"}
        ).status_code
        == 422
    )
    login = db_client.post(
        "/auth/token", data={"username": payload["email"], "password": payload["password"]}
    )
    assert login.status_code == 200
    assert "HttpOnly" in login.headers["set-cookie"]
    old_cookie = db_client.cookies.get("refresh_token")
    access = login.json()["access_token"]
    db_client.headers["Authorization"] = "Bearer " + access
    assert db_client.get("/auth/me").json()["email"] == payload["email"]
    renewed = db_client.post("/auth/refresh")
    assert renewed.status_code == 200
    assert db_client.cookies.get("refresh_token") != old_cookie
    fresh_cookie = db_client.cookies.get("refresh_token")
    db_client.cookies.clear()
    db_client.cookies.set("refresh_token", old_cookie)
    assert db_client.post("/auth/refresh").status_code == 401
    db_client.cookies.clear()
    db_client.cookies.set("refresh_token", fresh_cookie)
    assert db_client.post("/auth/logout").status_code == 204
    assert db_client.get("/auth/me").status_code == 401


def test_uniform_login_errors_and_limit(db_client):
    first = db_client.post("/auth/token", data={"username": "unknown@example.com", "password": "incorrect1"})
    second = db_client.post(
        "/auth/token", data={"username": "librarian@example.com", "password": "incorrect1"}
    )
    assert first.status_code == second.status_code == 401
    assert first.json()["message"] == second.json()["message"]
    for _ in range(3):
        assert (
            db_client.post(
                "/auth/token", data={"username": "unknown@example.com", "password": "incorrect1"}
            ).status_code
            == 401
        )
    assert (
        db_client.post(
            "/auth/token", data={"username": "unknown@example.com", "password": "incorrect1"}
        ).status_code
        == 429
    )


@pytest.mark.parametrize("resource", ["books", "authors"])
@pytest.mark.parametrize("method", ["post", "patch", "delete"])
@pytest.mark.parametrize("role", ["guest", "member", "librarian"])
def test_permissions(db_client, db_author, member_token, librarian_token, resource, method, role):
    payload = (
        {"title": "Матрица прав", "author_id": db_author.id, "year": 2020}
        if resource == "books"
        else {"name": "Автор матрицы"}
    )
    path = "/api/v1/" + resource
    if method != "post":
        if resource == "books":
            created = db_client.post(path, json=payload).json()
            path += "/" + str(created["id"])
        else:
            path += "/" + str(db_author.id)
    db_client.headers.pop("Authorization", None)
    if role != "guest":
        db_client.headers["Authorization"] = "Bearer " + (
            member_token if role == "member" else librarian_token
        )
    expected = (
        401
        if role == "guest"
        else 403
        if role == "member"
        else {"post": 201, "patch": 200, "delete": 204}[method]
    )
    kwargs = {"json": payload} if method != "delete" else {}
    assert getattr(db_client, method)(path, **kwargs).status_code == expected


def test_idor_and_member_issue(db_client, db, db_author, db_reader, member_token):
    book = db_client.post(
        "/api/v1/books", json={"title": "IDOR", "author_id": db_author.id, "year": 2020}
    ).json()
    loan = db_client.post(
        f"/api/v1/books/{book['id']}/loans",
        json={"user_id": db_reader.id, "due_date": str(date.today() + timedelta(days=14))},
    ).json()
    db_client.headers["Authorization"] = "Bearer " + member_token
    assert db_client.get(f"/api/v1/loans/{loan['id']}").status_code == 200
    from app.models import User

    other = User(email="other-reader@example.com", password_hash="disabled-test-account", role="member")
    db.add(other)
    db.commit()
    db_client.headers["Authorization"] = "Bearer " + create_token(other.id, "member", "access", 900)
    assert db_client.get(f"/api/v1/loans/{loan['id']}").status_code == 404
    assert db_client.patch(f"/api/v1/loans/{loan['id']}", json={"state": "returned"}).status_code == 404
    db_client.headers["Authorization"] = "Bearer " + create_token(
        db_reader.id + 99999, "member", "access", 900
    )
    assert db_client.get(f"/api/v1/loans/{loan['id']}").status_code == 401


def test_tampered_expired_and_wrong_type(db_client, db_reader):
    token = create_token(db_reader.id, "member", "access", 900)
    parts = token.split(".")
    payload = json.loads(base64.urlsafe_b64decode(parts[1] + "=="))
    payload["role"] = "librarian"
    parts[1] = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    for candidate in [
        ".".join(parts),
        create_token(db_reader.id, "member", "access", -60),
        create_token(db_reader.id, "member", "refresh", 900),
    ]:
        db_client.headers["Authorization"] = "Bearer " + candidate
        assert db_client.get("/auth/me").status_code == 401


def test_cors_and_cookie_origin(db_client):
    allowed = db_client.options(
        "/api/v1/books", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"}
    )
    assert allowed.headers.get("access-control-allow-origin") == "http://localhost:5173"
    forbidden = db_client.options(
        "/api/v1/books",
        headers={"Origin": "https://untrusted.example", "Access-Control-Request-Method": "POST"},
    )
    assert forbidden.status_code == 400
    assert db_client.post("/auth/refresh", headers={"Origin": "https://untrusted.example"}).status_code == 403


def test_confirmation_and_audit(db_client, db, db_author, caplog, monkeypatch):
    import logging
    from sqlalchemy import func, select
    from app.models import AuditEvent

    # Только этот изолированный учебный тест разрешает код в локальном захваченном журнале.
    monkeypatch.setenv("LOG_EMAIL_CONFIRMATION", "true")
    caplog.set_level(logging.INFO, logger="booknest.auth")
    response = db_client.post(
        "/auth/register", json={"email": "confirm@example.com", "password": "Confirm123"}
    )
    assert response.status_code == 201
    record = next(record for record in caplog.records if "Учебный код подтверждения" in record.message)
    confirmation = record.message.split("token=", 1)[1]
    assert db_client.post("/auth/confirm-email", json={"token": confirmation}).status_code == 200
    assert db_client.post("/auth/confirm-email", json={"token": confirmation}).status_code == 401
    before = db.scalar(select(func.count()).select_from(AuditEvent))
    assert (
        db_client.post(
            "/api/v1/books", json={"title": "Аудит", "author_id": db_author.id, "year": 2020}
        ).status_code
        == 201
    )
    assert db.scalar(select(func.count()).select_from(AuditEvent)) == before + 1
