"""ЛР9/10: права, cookie, отзыв и честная обработка конфликтов на локальной _test БД."""
import logging
from types import SimpleNamespace
import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.core.security import create_token, token_hash
from app.models import DeniedToken
from app.repositories.wishlist import WishlistRepository


def test_normal_registration_logs_have_no_confirmation_token(db_client, caplog, monkeypatch):
    monkeypatch.setenv("LOG_EMAIL_CONFIRMATION", "false")
    caplog.set_level(logging.INFO, logger="booknest")
    payload = {"email": "safe-log@example.com", "password": "PRIVATE-password-123"}
    result = db_client.post("/api/v1/auth/register", json=payload)
    assert result.status_code == 201
    db_client.get("/health?code=PRIVATE-query-marker")
    messages = "\n".join(item.getMessage() for item in caplog.records if item.name.startswith("booknest"))
    assert "token=" not in messages
    assert payload["password"] not in messages and "PRIVATE-query-marker" not in messages
    assert not {"password", "password_hash", "refresh_token", "access_token"} & result.json().keys()


@pytest.mark.parametrize("endpoint", ["token", "refresh", "logout"])
def test_forbidden_origin_cannot_set_or_delete_session_cookie(db_client, endpoint):
    kwargs = {"data": {"username": "fixture@example.test", "password": "Fixture-pass-123"}} if endpoint == "token" else {}
    result = db_client.post(f"/api/v1/auth/{endpoint}", headers={"Origin": "https://untrusted.example"}, **kwargs)
    assert result.status_code == 403
    assert "set-cookie" not in result.headers
    assert result.json()["request_id"] == result.headers["X-Request-ID"]


def test_secure_cookie_login_and_revocation_store_only_digests(db_client, db, monkeypatch):
    monkeypatch.setenv("COOKIE_SECURE", "true")
    db_client.headers.pop("Authorization")
    body = {"email": "cookie-flow@example.com", "password": "Fixture-pass-123"}
    assert db_client.post("/api/v1/auth/register", json=body).status_code == 201
    # Origin из действующей локальной конфигурации тестового стенда разрешен.
    login = db_client.post("/api/v1/auth/token", data={"username": body["email"], "password": body["password"]}, headers={"Origin": "http://localhost:5173"})
    assert login.status_code == 200
    header = login.headers["set-cookie"].lower()
    assert all(flag in header for flag in ["httponly", "secure", "samesite=strict", "path=/"])
    assert login.headers["cache-control"] == "no-store"
    refresh = db_client.cookies.get("refresh_token")
    access = login.json()["access_token"]
    # TestClient использует HTTP: Secure-cookie намеренно не посылается браузером автоматически.
    # Для проверки серверного отзыва заголовок передается явно, реальная TLS-среда не заявляется.
    db_client.headers["Authorization"] = "Bearer " + access
    result = db_client.post("/api/v1/auth/logout", headers={"Cookie": "refresh_token=" + refresh})
    assert result.status_code == 204
    assert "secure" in result.headers["set-cookie"].lower()
    assert db_client.get("/api/v1/auth/me").status_code == 401
    assert db_client.post("/api/v1/auth/refresh", headers={"Cookie": "refresh_token=" + refresh}).status_code == 401
    stored = set(db.scalars(select(DeniedToken.digest)))
    assert {token_hash(access), token_hash(refresh)} <= stored
    assert access not in stored and refresh not in stored
    assert all(len(value) == 64 for value in stored)


def test_database_role_overrides_old_librarian_claim(db_client, db_reader, db_author):
    db_client.headers["Authorization"] = "Bearer " + create_token(db_reader.id, "librarian", "access", 900)
    result = db_client.post("/api/v1/books", json={"title": "Запрет роли", "author_id": db_author.id, "year": 2000})
    assert result.status_code == 403
    assert db_client.get("/api/v1/audit-events").status_code == 403


def test_disabled_user_loses_access_and_refresh(db_client, db, db_reader, member_token):
    refresh = create_token(db_reader.id, "member", "refresh", 900)
    db_reader.is_active = False
    db.commit()
    db_client.headers["Authorization"] = "Bearer " + member_token
    assert db_client.get("/api/v1/wishlist").status_code == 401
    assert db_client.post("/api/v1/auth/refresh", headers={"Cookie": "refresh_token=" + refresh}).status_code == 401


def test_personal_responses_and_forbidden_access_are_not_cached(db_client, member_token):
    db_client.headers["Authorization"] = "Bearer " + member_token
    for path, status in [("/api/v1/wishlist", 200), ("/api/v1/loans", 200), ("/api/v1/audit-events", 403)]:
        response = db_client.get(path)
        assert response.status_code == status
        assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("constraint,status", [("wishlist_entries_pkey", 204), ("wishlist_entries_book_id_fkey", 409), (None, 409)])
def test_only_duplicate_wishlist_key_is_idempotent_success(db_client, db_author, monkeypatch, constraint, status):
    book = db_client.post("/api/v1/books", json={"title": "Конфликт желаемого", "author_id": db_author.id, "year": 2000}).json()
    def conflict(self, user_id, book_id):
        original = Exception("PRIVATE-SQL-MARKER")
        original.diag = SimpleNamespace(constraint_name=constraint)
        raise IntegrityError("PRIVATE-SQL-MARKER", {}, original)
    monkeypatch.setattr(WishlistRepository, "add", conflict)
    result = db_client.post(f"/api/v1/wishlist/{book['id']}")
    assert result.status_code == status
    assert "PRIVATE-SQL-MARKER" not in result.text
    assert db_client.get(f"/api/v1/books/{book['id']}").status_code == 200
