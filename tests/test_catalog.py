"""Проверяются реальные HTTP-контракты, включая ошибочные данные."""

import pytest
from fastapi.testclient import TestClient
from app.legacy import create_app


@pytest.fixture
def client():
    # Каждому тесту выдаётся новое хранилище, результаты не зависят от порядка.
    with TestClient(create_app()) as value:
        yield value


@pytest.fixture
def book(client):
    author = client.post("/api/v1/authors", json={"name": "Автор"}).json()
    response = client.post(
        "/api/v1/books",
        json={"title": "Книга", "author_id": author["id"], "year": 2020, "isbn": "9780306406157"},
    )
    assert response.status_code == 201
    return response.json()


def test_health(client):
    response = client.get("/health")
    assert response.json() == {"status": "ok"}
    assert response.headers["X-Request-ID"]


def test_create_and_read(client, book):
    assert client.get(f"/api/v1/books/{book['id']}").json() == book


@pytest.mark.parametrize("method", ["get", "patch", "delete"])
def test_missing(client, method):
    kwargs = {"json": {}} if method == "patch" else {}
    assert getattr(client, method)("/api/v1/books/999", **kwargs).status_code == 404


def test_duplicate_isbn(client, book):
    data = {key: book[key] for key in ["title", "author_id", "year", "isbn"]}
    assert client.post("/api/v1/books", json=data).status_code == 409


@pytest.mark.parametrize(
    "changes",
    [{"title": "  "}, {"year": 100}, {"isbn": "9780306406158"}, {"total_copies": -1}, {"unknown": 1}],
)
def test_invalid(client, book, changes):
    response = client.patch(f"/api/v1/books/{book['id']}", json=changes)
    assert response.status_code == 422
    assert response.json()["request_id"]


def test_partial_update(client, book):
    result = client.patch(f"/api/v1/books/{book['id']}", json={"title": "Новое имя"}).json()
    assert result["title"] == "Новое имя"
    assert result["year"] == book["year"]


def test_delete(client, book):
    response = client.delete(f"/api/v1/books/{book['id']}")
    assert response.status_code == 204
    assert response.content == b""
    assert client.get(f"/api/v1/books/{book['id']}").status_code == 404


def test_author_reference(client, book):
    assert client.delete(f"/api/v1/authors/{book['author_id']}").status_code == 409
    assert client.get(f"/api/v1/authors/{book['author_id']}/books").json()["total"] == 1


def test_filters_and_pagination(client, book):
    response = client.get("/api/v1/books", params={"q": "Кни", "size": 1, "sort": "-year,title"})
    assert response.json()["items"][0]["id"] == book["id"]
    assert client.get("/api/v1/books?q=нет").json()["total"] == 0
    assert client.get("/api/v1/books?sort=bad").status_code == 422
    assert client.get("/api/v1/books?page=0").status_code == 422


def test_author_crud(client):
    author = client.post("/api/v1/authors", json={"name": "Писатель"}).json()
    path = f"/api/v1/authors/{author['id']}"
    assert client.patch(path, json={"name": "Другое имя"}).json()["name"] == "Другое имя"
    assert client.get("/api/v1/authors?size=1").json()["total"] == 1
    assert client.delete(path).status_code == 204
    assert client.get(path).status_code == 404
