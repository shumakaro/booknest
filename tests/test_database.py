"""Проверяются сохранение контракта и бизнес-правило выдачи."""

from datetime import date, timedelta
import pytest


@pytest.fixture
def db_book(db_client, db_author):
    response = db_client.post(
        "/api/v1/books",
        json={"title": "Книга БД", "author_id": db_author.id, "year": 2020, "total_copies": 1},
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_database_crud(db_client, db_book):
    path = f"/api/v1/books/{db_book['id']}"
    assert db_client.get(path).json()["title"] == "Книга БД"
    assert db_client.patch(path, json={"year": 2021}).json()["year"] == 2021
    assert db_client.delete(path).status_code == 204
    assert db_client.get(path).status_code == 404
    assert db_client.get("/api/v1/books").json()["total"] == 0


def test_database_filters(db_client, db_book, db_author):
    assert db_client.get("/api/v1/books?q=БД&size=1&sort=-year,title").json()["total"] == 1
    assert db_client.get("/api/v1/books?q=нет").json()["total"] == 0
    assert db_client.get(f"/api/v1/authors/{db_author.id}/books").json()["total"] == 1
    assert db_client.get("/api/v1/books?q=%27%20OR%201%3D1%20--").json()["total"] == 0


def test_database_loan_conflict_and_return(db_client, db_book, db_reader):
    payload = {"user_id": db_reader.id, "due_date": str(date.today() + timedelta(days=14))}
    path = f"/api/v1/books/{db_book['id']}/loans"
    first = db_client.post(path, json=payload)
    assert first.status_code == 201, first.text
    assert db_client.post(path, json=payload).status_code == 409
    assert db_client.get("/api/v1/books?available_only=true").json()["total"] == 0
    assert (
        db_client.patch(f"/api/v1/loans/{first.json()['id']}", json={"state": "returned"}).status_code == 200
    )
    assert db_client.get("/api/v1/books?available_only=true").json()["total"] == 1


def test_database_integrity_and_null(db_client, db_book):
    path = f"/api/v1/books/{db_book['id']}"
    assert db_client.patch(path, json={"title": None}).status_code == 422
    assert db_client.patch(path, json={"author_id": 999999}).status_code == 404
    assert db_client.get("/api/v1/books?genre=unknown").status_code == 422
