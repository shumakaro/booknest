"""Импорт использует отдельную тестовую PostgreSQL и откат каждой транзакции."""
from sqlalchemy import func, select
from app.models import Book
from app.services.open_library import ExternalDetails, get_open_library


def setup_source(client):
    class Source:
        def details(self, work_id):
            return ExternalDetails(id=work_id, title="Настоящая книга", authors=["Проверенный автор"],
                                   year=None, cover_id=123, description="Описание из источника")
    client.app.dependency_overrides[get_open_library] = Source


def test_import_is_idempotent_and_preserves_edits(db_client, db):
    setup_source(db_client)
    payload = {"work_id": "OL123W", "year": 2001, "total_copies": 2}
    first = db_client.post("/api/v1/discover/imports", json=payload)
    assert first.status_code == 201, first.text
    item = first.json()
    assert item["cover_id"] == 123 and item["external_work_id"] == "OL123W"
    assert db_client.patch(f"/api/v1/books/{item['id']}", json={"title": "Изменено библиотекарем"}).status_code == 200
    second = db_client.post("/api/v1/discover/imports", json={**payload, "total_copies": 99})
    assert second.status_code == 200
    assert second.json()["id"] == item["id"]
    assert second.json()["title"] == "Изменено библиотекарем"
    assert second.json()["total_copies"] == 2
    assert db.scalar(select(func.count()).select_from(Book)) == 1
    assert db_client.delete(f"/api/v1/books/{item['id']}").status_code == 204
    assert db_client.post("/api/v1/discover/imports", json=payload).status_code == 409


def test_member_and_guest_cannot_import(db_client, member_token):
    setup_source(db_client)
    payload = {"work_id": "OL123W", "year": 2001}
    db_client.headers["Authorization"] = "Bearer " + member_token
    assert db_client.post("/api/v1/discover/imports", json=payload).status_code == 403
    db_client.headers.pop("Authorization")
    assert db_client.post("/api/v1/discover/imports", json=payload).status_code == 401


def test_import_links_manual_book_without_overwriting_copies(db_client, db):
    setup_source(db_client)
    author = db_client.post("/api/v1/authors", json={"name": "Проверенный автор"}).json()
    previous = db_client.post("/api/v1/books", json={"title": "Настоящая книга", "author_id": author["id"],
                                                  "year": 2001, "total_copies": 3}).json()
    response = db_client.post("/api/v1/discover/imports", json={"work_id": "OL123W", "year": 2001})
    assert response.status_code == 200
    assert response.json()["id"] == previous["id"] and response.json()["total_copies"] == 3
    assert db.scalar(select(func.count()).select_from(Book)) == 1
