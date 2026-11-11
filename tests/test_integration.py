"""Проверки интеграции, которые защищают новые реальные пользовательские сценарии."""

from fastapi.testclient import TestClient
from app.main import create_app


def test_saved_form_fields_and_cross_validation(db_client, db_author):
    payload = {
        "title": "Данные формы",
        "author_id": db_author.id,
        "year": 2020,
        "edition_year": 2022,
        "publisher": "Учебное издательство",
        "language": "Русский",
        "pages": 240,
    }
    response = db_client.post("/api/v1/books", json=payload)
    assert response.status_code == 201, response.text
    book_id = response.json()["id"]
    restored = db_client.get(f"/api/v1/books/{book_id}").json()
    for field in ["publisher", "language", "edition_year", "pages"]:
        assert restored[field] == payload[field]
    assert db_client.patch(f"/api/v1/books/{book_id}", json={"year": 2025}).status_code == 422
    assert (
        db_client.patch(f"/api/v1/books/{book_id}", json={"year": 2025, "edition_year": 2026}).status_code
        == 200
    )


def test_wishlist_ownership_and_soft_delete(db_client, db_author, member_token, librarian_token):
    book = db_client.post(
        "/api/v1/books", json={"title": "Персональная книга", "author_id": db_author.id, "year": 2020}
    ).json()
    assert db_client.post(f"/api/v1/wishlist/{book['id']}").status_code == 204
    assert db_client.post(f"/api/v1/wishlist/{book['id']}").status_code == 204
    assert db_client.get("/api/v1/wishlist").json()["total"] == 1
    db_client.headers["Authorization"] = "Bearer " + member_token
    assert db_client.get("/api/v1/wishlist").json()["total"] == 0
    db_client.headers["Authorization"] = "Bearer " + librarian_token
    assert db_client.delete(f"/api/v1/books/{book['id']}").status_code == 204
    assert db_client.get("/api/v1/wishlist").json()["total"] == 0


def test_unexpected_error_is_safe_and_traceable():
    app = create_app()

    @app.get("/test-crash")
    def crash():
        raise RuntimeError("internal-password-must-never-leak")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/test-crash")
    assert response.status_code == 500
    assert "internal-password" not in response.text
    assert response.json()["request_id"] == response.headers["X-Request-ID"]
    assert response.json()["code"] == "HTTP_500"


def test_partial_form_patch_and_optional_isbn(db_client, db_author):
    """Форма может менять название без перезаписи других проверенных характеристик."""
    payload = {"title": "Книга формы", "author_id": db_author.id, "year": 2000,
               "edition_year": 2001, "isbn": "9780306406157", "publisher": "Издательство",
               "language": "ru", "pages": 240, "total_copies": 3,
               "genre": "poetry", "description": "Описание библиотекаря"}
    created = db_client.post("/api/v1/books", json=payload)
    assert created.status_code == 201
    path = f"/api/v1/books/{created.json()['id']}"
    updated = db_client.patch(path, json={"title": "Новое название"})
    assert updated.status_code == 200
    for field in payload.keys() - {"title"}:
        assert updated.json()[field] == payload[field]
    duplicate = db_client.post("/api/v1/books", json=payload)
    assert duplicate.status_code == 409 and "ISBN" in duplicate.json()["message"]
    cleared = db_client.patch(path, json={"isbn": None})
    assert cleared.status_code == 200 and cleared.json()["isbn"] is None
    assert cleared.json()["pages"] == 240


def test_form_copies_and_delete_keep_loan_history(db_client, db_author, db_reader, db):
    """Конфликты экземпляров не обходятся формой, мягкое удаление сохраняет выдачу."""
    from datetime import date, timedelta
    from app.models import Loan

    book = db_client.post("/api/v1/books", json={"title": "Книга истории", "author_id": db_author.id,
                                               "year": 2000, "total_copies": 2}).json()
    path = f"/api/v1/books/{book['id']}"
    issued = db_client.post(path + "/loans", json={"user_id": db_reader.id,
                          "due_date": str(date.today() + timedelta(days=14))})
    assert issued.status_code == 201
    assert db_client.patch(path, json={"total_copies": 0}).status_code == 409
    assert db_client.delete(path).status_code == 409
    loan_id = issued.json()["id"]
    assert db_client.patch(f"/api/v1/loans/{loan_id}", json={"state": "returned"}).status_code == 200
    assert db_client.delete(path).status_code == 204
    assert db_client.get(path).status_code == 404
    assert db.get(Loan, loan_id).returned_at is not None
