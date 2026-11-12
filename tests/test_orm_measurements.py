"""ЛР8: безопасный стенд и постоянное число запросов существующих списков."""
from datetime import date, timedelta
import pytest
from sqlalchemy import CheckConstraint, event, inspect, select
from sqlalchemy.exc import IntegrityError
from app.models import Author, Book, Genre, Loan, User, WishlistEntry
from app.repositories.catalog import CatalogRepository
from app.repositories.wishlist import WishlistRepository
from tools.measure_orm import validate_test_url


@pytest.mark.parametrize("target", [None, "postgresql+psycopg://localhost/booknest",
    "postgresql+psycopg://remote.example/booknest_test", "sqlite:///booknest_test"])
def test_measurement_rejects_unsafe_target(target):
    with pytest.raises(ValueError):
        validate_test_url(target, "postgresql+psycopg://localhost/production")


def test_measurement_rejects_same_database_with_different_credentials():
    with pytest.raises(ValueError):
        validate_test_url("postgresql+psycopg://reader@127.0.0.1:5432/shared_test", "postgresql+psycopg://writer@localhost/shared_test")
    target = "postgresql+psycopg://127.0.0.1:55432/separate_test"
    assert validate_test_url(target, "postgresql+psycopg://localhost/production") == target


@pytest.mark.parametrize("size", [1, 20])
def test_catalog_and_wishlist_query_budget_with_multiple_genres(db, db_reader, size):
    """Новые авторы не увеличивают число SELECT, M:N не умножает total или доступность."""
    genres = []
    for code in ["fiction", "cs"]:
        genre = db.scalar(select(Genre).where(Genre.code == code))
        if genre is None:
            genre = Genre(code=code, name=code)
            db.add(genre)
        genres.append(genre)
    books = []
    for index in range(22):
        author = Author(name=f"Бюджет автор {index:02}")
        book = Book(title=f"Бюджет книга {index:02}", author=author, year=2000,
                    edition_year=2000, total_copies=2, genres=genres)
        db.add(book)
        books.append(book)
    db.flush()
    reader_id = db_reader.id
    for book in books:
        db.add(WishlistEntry(user_id=reader_id, book_id=book.id))
    db.add(Loan(book_id=books[0].id, user_id=reader_id, due_date=date.today()+timedelta(days=14)))
    db.commit()
    connection = db.connection()
    for repository in ["catalog", "wishlist"]:
        db.expunge_all()
        statements = []
        def capture(conn, cursor, statement, parameters, context, executemany):
            if statement.lstrip().upper().startswith("SELECT"):
                statements.append(statement)
        event.listen(connection, "before_cursor_execute", capture)
        try:
            data = (CatalogRepository(db).list_books(page=1, size=size, q="Бюджет") if repository == "catalog"
                    else WishlistRepository(db).list(reader_id, 1, size))
            assert data["total"] == 22 and len(data["items"]) == size
            assert data["items"][0]["available"] == 1
            assert all(item["available"] == 2 for item in data["items"][1:])
            assert len(statements) == 4
        finally:
            event.remove(connection, "before_cursor_execute", capture)


def test_model_checks_match_existing_migrated_database(db):
    """Metadata не должна терять уже примененные ограничения миграций."""
    metadata = inspect(db.connection())
    for model in [Author, Book, Genre, User, Loan]:
        expected = {item.name for item in model.__table__.constraints if isinstance(item, CheckConstraint)}
        actual = {item["name"] for item in metadata.get_check_constraints(model.__tablename__)}
        assert actual == expected


@pytest.mark.parametrize("field,value,constraint", [
    ("external_work_id", "not-a-work", "books_external_work_id_ck"),
    ("cover_id", 0, "books_cover_id_ck"),
])
def test_external_book_constraints_are_real_postgres_checks(db, db_author, field, value, constraint):
    """Неверная запись отклоняется самой PostgreSQL; savepoint сохраняет внешний тестовый откат."""
    with pytest.raises(IntegrityError) as caught:
        with db.begin_nested():
            db.add(Book(title="Проверка ограничений", author_id=db_author.id, year=2000,
                        edition_year=2000, **{field: value}))
            db.flush()
    assert caught.value.orig.diag.constraint_name == constraint
