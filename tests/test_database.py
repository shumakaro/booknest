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
    assert db_client.patch(path, json={"year": 2021, "edition_year": 2021}).json()["year"] == 2021
    assert db_client.delete(path).status_code == 204
    assert db_client.get(path).status_code == 404
    assert db_client.get("/api/v1/books").json()["total"] == 0


def test_database_filters(db_client, db_book, db_author):
    assert db_client.get("/api/v1/books?q=БД&size=1&sort=-year,title").json()["total"] == 1
    assert db_client.get("/api/v1/books", params={"q": "бд"}).json()["total"] == 1
    assert db_client.get("/api/v1/books?q=нет").json()["total"] == 0
    assert db_client.get(f"/api/v1/authors/{db_author.id}/books").json()["total"] == 1
    assert db_client.get("/api/v1/books?q=%27%20OR%201%3D1%20--").json()["total"] == 0


def test_search_covers_records_beyond_first_thirty(db_client, db, db_author):
    from app.models import Book

    # Записи находятся во внешней откатываемой транзакции отдельной тестовой БД.
    books = [Book(title=f"Проверка пагинации {number:02}", author_id=db_author.id,
                  year=2001, edition_year=2001, total_copies=1) for number in range(1, 36)]
    db.add_all(books)
    db.commit()
    first = db_client.get("/api/v1/books?size=20").json()
    second = db_client.get("/api/v1/books?size=20&page=2").json()
    assert first["total"] == second["total"] == 35
    assert len(first["items"]) == 20 and len(second["items"]) == 15
    assert not ({book["id"] for book in first["items"]} & {book["id"] for book in second["items"]})
    found = db_client.get("/api/v1/books?q=пагинации%2035").json()
    assert found["total"] == 1 and found["items"][0]["id"] == books[-1].id


@pytest.mark.parametrize("query", ["мария", "МАРИЯ", "ёлкин", "ЁЛКИН", "100%_Автор", "  Мария   100%_Автор  "])
def test_catalog_search_matches_author_without_duplicates(db_client, db, query):
    """Автор ищется по всей БД; спецсимволы не превращаются в SQL-шаблон."""
    from app.models import Author, Book

    author = Author(name="Мария 100%_Автор Ёлкин")
    other = Author(name="Другой 100ABАвтор")
    db.add_all([author, other])
    db.flush()
    books = [Book(title=f"Одинаковое название {number}", author_id=author.id,
                  year=2000, edition_year=2000, total_copies=1) for number in range(2)]
    db.add_all(books + [Book(title="Посторонняя книга", author_id=other.id,
                            year=2000, edition_year=2000, total_copies=1)])
    db.commit()
    first = db_client.get("/api/v1/books", params={"q": query, "size": 1, "page": 1}).json()
    second = db_client.get("/api/v1/books", params={"q": query, "size": 1, "page": 2}).json()
    assert first["total"] == second["total"] == 2
    assert {first["items"][0]["id"], second["items"][0]["id"]} == {book.id for book in books}


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


def test_overdue_view(db_client, db, db_book, db_reader):
    from app.models import Loan

    # Просроченная запись добавляется только в изолированную транзакцию теста.
    loan = Loan(
        book_id=db_book["id"],
        user_id=db_reader.id,
        issued_at=date.today() - timedelta(days=20),
        due_date=date.today() - timedelta(days=10),
    )
    db.add(loan)
    db.commit()
    result = db_client.get("/api/v1/reports/overdue-loans")
    assert result.status_code == 200
    assert result.json()["items"][0]["id"] == loan.id
    assert result.json()["total"] == 1
