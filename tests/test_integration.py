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
