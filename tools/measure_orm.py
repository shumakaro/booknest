"""ЛР8: измерения существующего ORM только в локальной _test БД с откатом данных."""
import argparse
from datetime import date, timedelta
import json
from pathlib import Path
from time import perf_counter
from uuid import uuid4
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, event, func, inspect, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, selectinload
from app.config import Settings
from app.models import Author, Book, Genre, Loan, User, WishlistEntry, book_genres
from app.repositories.catalog import CatalogRepository
from app.repositories.wishlist import WishlistRepository


def validate_test_url(test_url: str | None, production_url: str) -> str:
    """Строки не выводятся: проверяются только назначение БД и локальность узла."""
    if not test_url or test_url == production_url:
        raise ValueError("Нужна отдельная TEST_DATABASE_URL; рабочая БД не используется")
    target = make_url(test_url)
    local_hosts = {"localhost", "127.0.0.1", "::1"}
    if target.host not in local_hosts or not (target.database or "").endswith("_test"):
        raise ValueError("Измерение разрешено только в локальной БД с суффиксом _test")
    source = make_url(production_url)
    if (source.host in local_hosts and source.database == target.database
            and (source.port or 5432) == (target.port or 5432)):
        # Другой пароль/пользователь/localhost не делает ту же самую БД тестовой копией.
        raise ValueError("Тестовая БД должна отличаться от рабочей, а не только учетными данными")
    if target.drivername != "postgresql+psycopg":
        raise ValueError("Используется существующий PostgreSQL-драйвер psycopg")
    return test_url


def measure(output: Path) -> dict:
    settings = Settings()
    engine = create_engine(validate_test_url(settings.test_database_url, settings.database_url),
                           echo=False, connect_args={"connect_timeout": 3})
    tables = [Author.__table__, Book.__table__, Genre.__table__, User.__table__,
              Loan.__table__, WishlistEntry.__table__, book_genres]
    def counts(connection):
        return {table.name: connection.scalar(select(func.count()).select_from(table)) for table in tables}
    evidence = {"database": "local dedicated _test; no production connection", "fixture_books": 24,
                "sql_parameters_saved": False, "phases": {}}
    try:
        with engine.connect() as connection:
            # Инструмент не применяет миграции: версия должна быть уже готова к работе.
            required = set(ScriptDirectory.from_config(Config("alembic.ini")).get_heads())
            current = set(connection.scalars(text("SELECT version_num FROM alembic_version")))
            if current != required:
                raise ValueError("Ревизия тестовой БД не совпадает с head; миграции автоматически не запускаются")
            evidence["alembic_heads"] = sorted(current)
            before = counts(connection)
            connection.rollback()  # Завершается только собственное чтение метаданных.
            transaction = connection.begin()
            try:
                with Session(bind=connection, expire_on_commit=False, join_transaction_mode="rollback_only") as db:
                    prefix = "orm-" + uuid4().hex[:12]
                    genres = []
                    for code in ["fiction", "cs"]:
                        genre = db.scalar(select(Genre).where(Genre.code == code))
                        if genre is None:
                            genre = Genre(code=code, name=code)
                            db.add(genre)
                        genres.append(genre)
                    reader = User(email=prefix+"@example.test", password_hash="disabled-measurement-account", role="member")
                    db.add(reader)
                    books = []
                    for index in range(24):
                        author = Author(name=f"{prefix} автор {index:02}")
                        book = Book(title=f"{prefix} книга {index:02}", author=author, year=2000,
                                    edition_year=2000, total_copies=2, genres=genres)
                        db.add(book)
                        books.append(book)
                    db.flush()
                    reader_id = reader.id
                    for index, book in enumerate(books):
                        db.add(WishlistEntry(user_id=reader_id, book_id=book.id))
                        if index < 12:
                            db.add(Loan(book_id=book.id, user_id=reader_id, issued_at=date.today()-timedelta(days=2),
                                        due_date=date.today()+timedelta(days=14), returned_at=date.today() if index >= 6 else None))
                    db.flush()
                    def record(label, action):
                        # Холодная identity map не маскирует N+1 повторным использованием объектов.
                        db.expunge_all()
                        queries = []
                        def capture(conn, cursor, statement, parameters, context, executemany):
                            if statement.lstrip().upper().startswith("SELECT"):
                                queries.append((statement, parameters))
                        event.listen(connection, "before_cursor_execute", capture)
                        started = perf_counter()
                        try:
                            result = action()
                        finally:
                            elapsed = (perf_counter()-started)*1000
                            event.remove(connection, "before_cursor_execute", capture)
                        evidence["phases"][label] = {"select_count": len(queries), "elapsed_ms": round(elapsed, 3),
                                                       "sql": [sql for sql, parameters in queries]}
                        return result, queries
                    def control(eager):
                        stmt = select(Book).where(Book.title.startswith(prefix)).order_by(Book.id).limit(20)
                        if eager:
                            stmt = stmt.options(selectinload(Book.author), selectinload(Book.genres))
                        return [(book.id, book.author.name, sorted(genre.code for genre in book.genres)) for book in db.scalars(stmt)]
                    lazy, _ = record("demonstration_lazy", lambda: control(False))
                    eager, _ = record("demonstration_selectin", lambda: control(True))
                    assert lazy == eager
                    assert evidence["phases"]["demonstration_lazy"]["select_count"] == 41
                    assert evidence["phases"]["demonstration_selectin"]["select_count"] == 3
                    for size in [1, 20]:
                        data, queries = record(f"actual_catalog_{size}", lambda: CatalogRepository(db).list_books(page=1, size=size, q=prefix))
                        assert data["total"] == 24 and len(data["items"]) == size
                        assert evidence["phases"][f"actual_catalog_{size}"]["select_count"] == 4
                        assert all(item["available"] == (1 if number < 6 else 2) for number, item in enumerate(data["items"]))
                        if size == 20:
                            # План именно текущего SELECT репозитория, с параметрами только в памяти.
                            evidence["catalog_plan"] = connection.exec_driver_sql(
                                "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + queries[1][0], queries[1][1]).scalar_one()
                        wishlist, _ = record(f"actual_wishlist_{size}", lambda: WishlistRepository(db).list(reader_id, 1, size))
                        assert wishlist["total"] == 24 and len(wishlist["items"]) == size
                        assert evidence["phases"][f"actual_wishlist_{size}"]["select_count"] == 4
                    metadata = inspect(connection)
                    evidence["checks"] = {table: sorted(item["name"] for item in metadata.get_check_constraints(table)) for table in ["books", "authors", "genres", "users", "loans"]}
                    evidence["indexes"] = {table: sorted(item["name"] for item in metadata.get_indexes(table)) for table in ["books", "loans", "wishlist_entries"]}
                    # get_indexes не перечисляет первичный ключ: его индекс показывается отдельно.
                    evidence["primary_keys"] = {table: metadata.get_pk_constraint(table) for table in ["books", "loans", "book_genres", "wishlist_entries"]}
                    evidence["foreign_keys"] = {table: [{"columns": item["constrained_columns"], "target": item["referred_table"], "ondelete": item["options"].get("ondelete")} for item in metadata.get_foreign_keys(table)] for table in ["books", "book_genres", "loans", "wishlist_entries"]}
            finally:
                if transaction.is_active:
                    transaction.rollback()
            after = counts(connection)
            assert before == after
            evidence.update({"counts_before": before, "counts_after": after, "rollback_verified": True,
                             "same_control_rows": True, "production_changed": False,
                             "limitations": "Small warm-cache fixture; demonstration is not an old application version. Sequences may advance despite rollback. No index/DDL changes."})
    finally:
        engine.dispose()
    output.write_text(json.dumps(evidence, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    return evidence


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("docs/improvements/stage12-orm-measurements.json"))
    args = parser.parse_args()
    result = measure(args.output)
    print(json.dumps({"select_counts": {key: item["select_count"] for key, item in result["phases"].items()},
                      "rollback_verified": result["rollback_verified"]}, ensure_ascii=False))
