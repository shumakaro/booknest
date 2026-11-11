"""ЛР8–10: фильтрация реальных выдач и сохранность экземпляров в отдельной _test БД."""
from datetime import date, timedelta, datetime, timezone
import pytest
from sqlalchemy import event, update
from fastapi import HTTPException
from app.models import Book, Loan, User
from app.repositories.catalog import LoanRepository
from app.services.catalog import LoanService


@pytest.mark.parametrize("state,expected", [("all", 4), ("active", 3), ("overdue", 1), ("returned", 1)])
def test_states_before_pagination_and_personal_scope(db_client, db, db_author, db_reader, member_token, state, expected):
    """Фильтр охватывает все страницы, чужие записи и возвращенные просрочки исключаются."""
    today = date.today()
    books = [Book(title=f"Книга выдачи {i}", author_id=db_author.id, year=2000,
                  edition_year=2000, total_copies=1) for i in range(5)]
    other = User(email="loan-other@example.test", password_hash="disabled-test-account", role="member")
    db.add_all([*books, other])
    db.flush()
    for index, offset in enumerate([-1, 0, 5, -2, -3]):
        db.add(Loan(book_id=books[index].id, user_id=other.id if index == 4 else db_reader.id,
                    issued_at=today-timedelta(days=20), due_date=today+timedelta(days=offset),
                    returned_at=today if index == 3 else None))
    # История сохраняет название мягко удаленной книги без дополнительного запроса на строку.
    books[3].deleted_at = datetime.now(timezone.utc)
    db.commit()
    db_client.headers["Authorization"] = "Bearer " + member_token
    found = []
    for page in range(1, expected + 1):
        response = db_client.get("/api/v1/loans", params={"state": state, "size": 1, "page": page})
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == expected
        assert len(data["items"]) == 1
        item = data["items"][0]
        assert item["user_id"] == db_reader.id
        assert item["book_title"].startswith("Книга выдачи ")
        found.append(item["id"])
    assert len(set(found)) == expected
    assert db_client.get("/api/v1/loans?state=unknown").status_code == 422
    assert db_client.get("/api/v1/loans").json()["total"] == 4  # Прежний default=all сохранен.


def test_last_copy_repeat_return_and_reissue(db_client, db, db_author, db_reader, member_token):
    """Последняя копия не выдается дважды, повторный возврат не создает лишний экземпляр."""
    created = db_client.post("/api/v1/books", json={"title": "Последняя копия", "author_id": db_author.id,
                                                          "year": 2000, "total_copies": 1}).json()
    book_id = created["id"]
    other = User(email="loan-last@example.test", password_hash="disabled-test-account", role="member")
    db.add(other)
    db.commit()
    due = str(date.today()+timedelta(days=14))
    path = f"/api/v1/books/{book_id}/loans"
    loan = db_client.post(path, json={"user_id": db_reader.id, "due_date": due})
    assert loan.status_code == 201
    assert db_client.post(path, json={"user_id": other.id, "due_date": due}).status_code == 409
    assert db_client.get(f"/api/v1/books/{book_id}").json()["available"] == 0
    db_client.headers["Authorization"] = "Bearer " + member_token
    returned = f"/api/v1/loans/{loan.json()['id']}"
    assert db_client.patch(returned, json={"state": "returned"}).status_code == 200
    assert db_client.patch(returned, json={"state": "returned"}).status_code == 409
    assert db_client.get(f"/api/v1/books/{book_id}").json()["available"] == 1
    assert db_client.get("/api/v1/loans?state=active").json()["total"] == 0
    assert db_client.get("/api/v1/loans?state=returned").json()["total"] == 1
    assert db_client.post(path, json={"due_date": due}).status_code == 201
    assert db_client.get("/api/v1/loans?state=all").json()["total"] == 2


def test_loan_titles_have_constant_query_count(db_client, db, db_author, db_reader):
    """Список из нескольких книг требует count и одну выборку, без N+1 для названий."""
    today = date.today()
    for i in range(5):
        book = Book(title=f"SQL выдачи {i}", author_id=db_author.id, year=2000, edition_year=2000)
        db.add(book)
        db.flush()
        db.add(Loan(book_id=book.id, user_id=db_reader.id, due_date=today+timedelta(days=14)))
    db.commit()
    statements = []
    connection = db.connection()
    def record(conn, cursor, statement, parameters, context, executemany):
        statements.append(statement)
    event.listen(connection, "before_cursor_execute", record)
    try:
        data = LoanRepository(db).list(db_reader.id, 1, 20, "active")
        assert len(data["items"]) == 5
        assert all(item["book_title"] for item in data["items"])
        assert len(statements) == 2
    finally:
        event.remove(connection, "before_cursor_execute", record)


def test_return_refreshes_state_loaded_before_lock(db, db_author, db_reader):
    """Моделируется устаревший объект после проверки владения и изменения строки в БД."""
    today = date.today()
    book = Book(title="Повторный возврат", author_id=db_author.id, year=2000, edition_year=2000)
    db.add(book)
    db.flush()
    loan = Loan(book_id=book.id, user_id=db_reader.id, due_date=today+timedelta(days=14))
    db.add(loan)
    db.commit()
    assert LoanRepository(db).get(loan.id).returned_at is None
    # UPDATE обходит ORM-синхронизацию: в памяти None, но PostgreSQL уже хранит возврат.
    db.execute(update(Loan).where(Loan.id == loan.id).values(returned_at=today)
               .execution_options(synchronize_session=False))
    assert loan.returned_at is None
    with pytest.raises(HTTPException) as caught:
        LoanService(db).return_book(loan.id)
    assert caught.value.status_code == 409
    assert loan.returned_at == today
