"""ЛР9–10: журнал только для библиотекаря, без тел запросов и изменений при чтении."""
from datetime import datetime, timezone
import pytest
from sqlalchemy import func, select
from app.models import AuditEvent


@pytest.mark.parametrize("role,status", [("guest", 401), ("member", 403), ("librarian", 200)])
def test_audit_permissions(db_client, member_token, role, status):
    if role == "guest":
        db_client.headers.pop("Authorization")
    elif role == "member":
        db_client.headers["Authorization"] = "Bearer " + member_token
    result = db_client.get("/api/v1/audit-events")
    assert result.status_code == status
    if status == 200:
        assert result.json()["total"] == 0
        assert result.headers["cache-control"] == "no-store"


def test_audit_filter_pages_and_read_only(db_client, db, db_reader):
    """Страницы не теряют события с одинаковым временем; фильтр применяется до total."""
    stamp = datetime(2026, 11, 1, tzinfo=timezone.utc)
    events = [AuditEvent(user_id=db_reader.id if i else None, method="PATCH" if i % 2 else "POST",
                         path=f"/api/v1/books/{i+1}", created_at=stamp) for i in range(25)]
    db.add_all(events)
    db.commit()
    first = db_client.get("/api/v1/audit-events?size=20").json()
    second = db_client.get("/api/v1/audit-events?size=20&page=2").json()
    assert first["total"] == second["total"] == 25
    assert [item["id"] for item in first["items"] + second["items"]] == sorted([event.id for event in events], reverse=True)
    assert second["items"][-1]["user_id"] is None
    assert set(first["items"][0]) == {"id", "user_id", "method", "path", "created_at"}
    filtered = db_client.get("/api/v1/audit-events?method=PATCH&size=1&page=2").json()
    assert filtered["total"] == 12 and len(filtered["items"]) == 1
    assert filtered["items"][0]["method"] == "PATCH"
    assert db_client.get("/api/v1/audit-events?method=PUT").status_code == 422
    assert db_client.get("/api/v1/audit-events?page=0").status_code == 422
    assert db_client.get("/api/v1/audit-events?size=101").status_code == 422
    assert db_client.post("/api/v1/audit-events", json={}).status_code == 405
    assert db.scalar(select(func.count()).select_from(AuditEvent)) == 25


def test_successful_catalog_action_visible_without_new_read_events(db_client, db, db_author):
    """Существующая запись роли входит в ту же транзакцию каталога и читается новым API."""
    result = db_client.post("/api/v1/books", json={"title": "Журнал каталога", "author_id": db_author.id, "year": 2000})
    assert result.status_code == 201
    first = db_client.get("/api/v1/audit-events").json()
    second = db_client.get("/api/v1/audit-events").json()
    assert first == second
    assert first["total"] == 1
    assert first["items"][0]["path"] == "/api/v1/books"
    assert first["items"][0]["method"] == "POST"
