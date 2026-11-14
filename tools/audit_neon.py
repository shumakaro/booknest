"""Проверяет существующую Neon только чтением, не раскрывая строки подключения."""

import argparse
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import Base, Book


def check_connection(url: str, expected_heads: list[str]) -> dict:
    """Одна транзакция с согласованным снимком и запретом записи на стороне БД."""
    parsed = make_url(url)
    if not (parsed.host or "").endswith(".neon.tech"):
        return {"status": "failed", "reason": "expected_neon_host"}
    if parsed.query.get("sslmode") not in {"require", "verify-ca", "verify-full"}:
        return {"status": "failed", "reason": "tls_required"}
    engine = create_engine(
        parsed, echo=False, hide_parameters=True, poolclass=NullPool,
        connect_args={"connect_timeout": 15},
    )
    try:
        with engine.connect() as connection:
            with connection.begin():
                # Ограничения действуют только внутри этой транзакции, включая PgBouncer.
                connection.exec_driver_sql(
                    "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY"
                )
                connection.exec_driver_sql("SET LOCAL statement_timeout = 15000")
                connection.exec_driver_sql("SET LOCAL lock_timeout = 3000")
                reader = inspect(connection)
                tables = set(reader.get_table_names(schema="public"))
                revisions = sorted(connection.scalars(text(
                    "SELECT version_num FROM public.alembic_version"
                ))) if "alembic_version" in tables else []
                missing_tables = sorted(set(Base.metadata.tables) - tables)
                missing_columns = {}
                counts = {}
                # В отчет попадают только счетчики и имена схемы, без книг и пользователей.
                for name, table in Base.metadata.tables.items():
                    if name not in tables:
                        continue
                    present = {item["name"] for item in reader.get_columns(name, schema="public")}
                    missing = sorted(set(table.columns.keys()) - present)
                    if missing:
                        missing_columns[name] = missing
                    counts[name] = connection.scalar(text(f'SELECT count(*) FROM public."{name}"'))
                tls = bool(connection.connection.driver_connection.pgconn.ssl_in_use)
                result = {
                    "status": "ok", "client_tls": tls,
                    "transaction_read_only": connection.scalar(text("SHOW transaction_read_only")),
                    "revision": revisions, "revision_matches": revisions == expected_heads,
                    "missing_tables": missing_tables, "missing_columns": missing_columns,
                    "counts": counts,
                }
                if "books" in tables and not missing_columns.get("books"):
                    # Пробное чтение ORM доказывает совместимость полей; значения не сохраняются.
                    result["orm_book_read"] = len(connection.execute(select(Book).limit(1)).all()) <= 1
                    result["active_books"] = connection.scalar(text(
                        "SELECT count(*) FROM public.books WHERE deleted_at IS NULL"
                    ))
                    result["duplicate_external_ids"] = connection.scalar(text(
                        "SELECT count(*) FROM (SELECT external_work_id FROM public.books "
                        "WHERE external_work_id IS NOT NULL GROUP BY external_work_id "
                        "HAVING count(*) > 1) AS duplicates"
                    ))
                    result["book_indexes"] = sorted(
                        item["name"] for item in reader.get_indexes("books", schema="public")
                    )
                if not (tls and result["transaction_read_only"] == "on"
                        and result["revision_matches"] and not missing_tables and not missing_columns):
                    result["status"] = "needs_attention"
                # Выход завершает исключительно читающую транзакцию. DDL/DML здесь нет.
                return result
    except Exception as error:
        # str(error) может содержать адрес, логин и SQL; наружу выходит только тип ошибки.
        return {"status": "failed", "error_type": type(error).__name__}
    finally:
        engine.dispose()


def main() -> int:
    """Запись нового протокола требует явного пути и никогда не затирает старый."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--http", action="store_true", help="Проверить GET API через TestClient с реальной Neon")
    args = parser.parse_args()
    if args.output.exists():
        parser.error("Файл протокола уже существует; выберите новое имя")
    try:
        settings = Settings()
        heads = sorted(ScriptDirectory.from_config(Config("alembic.ini")).get_heads())
        pooled = make_url(settings.database_url)
        direct = make_url(settings.migration_url)
        # Не считаем локальный или чужой direct-адрес подтверждением этой же базы Neon.
        same_database = (
            (pooled.host or "").replace("-pooler", "") == direct.host
            and pooled.database == direct.database
            and "-pooler" in (pooled.host or "")
            and "-pooler" not in (direct.host or "")
        )
        result = {
            "checked_at_utc": datetime.now(timezone.utc).isoformat(),
            "expected_revision": heads, "connection_pair_matches": same_database,
            "production_writes": False,
            "connections": {
                "pooled": check_connection(settings.database_url, heads),
                "direct": check_connection(settings.migration_url, heads),
            } if same_database else {},
        }
        result["status"] = "ok" if same_database and all(
            item["status"] == "ok" for item in result["connections"].values()
        ) else "needs_attention"
        if args.http and result["status"] == "ok":
            result["http"] = check_http(settings.database_url)
            if result["http"]["status"] != "ok":
                result["status"] = "needs_attention"
    except Exception as error:
        result = {"status": "failed", "error_type": type(error).__name__}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(result, ensure_ascii=False, indent=2)
    with args.output.open("x", encoding="utf-8") as report:
        report.write(payload + "\n")
    print(payload)
    return 0 if result["status"] == "ok" else 1


def check_http(url: str) -> dict:
    """Текущий FastAPI читает настоящую БД; зависимость запрещает запись даже при ошибке API."""
    from fastapi.testclient import TestClient
    from app.db import get_db
    from app.main import create_app

    engine = create_engine(
        url, echo=False, hide_parameters=True, poolclass=NullPool,
        connect_args={"connect_timeout": 15},
    )

    def readonly_session():
        # У каждого GET свой снимок. HTTP-запросы не запускают миграции или seed.
        with engine.connect() as connection:
            with connection.begin():
                connection.exec_driver_sql("SET TRANSACTION READ ONLY")
                connection.exec_driver_sql("SET LOCAL statement_timeout = 15000")
                with Session(bind=connection, expire_on_commit=False) as session:
                    yield session

    previous_logging = logging.root.manager.disable
    # Параметры поиска и непредвиденные исключения не должны попасть в консольный лог.
    logging.disable(logging.CRITICAL)
    try:
        application = create_app()
        application.dependency_overrides[get_db] = readonly_session
        with TestClient(application) as client:
            def get(path, params=None):
                response = client.get(path, params=params)
                response.raise_for_status()
                return response.json()

            first = get("/api/v1/books", {"page": 1, "size": 7})
            ids = [book["id"] for book in first["items"]]
            total = first["total"]
            pages = (total + 6) // 7
            # Ограничение защищает рабочий сервис от случайного обхода огромной БД.
            if pages > 20:
                return {"status": "needs_attention", "reason": "too_many_pages", "total": total}
            for page in range(2, pages + 1):
                ids.extend(book["id"] for book in get(
                    "/api/v1/books", {"page": page, "size": 7}
                )["items"])
            checks = {
                "pagination_complete": len(ids) == len(set(ids)) == total,
                "empty_search": get("/api/v1/books", {"q": "BookNest-no-match-98472f0b"})["total"] == 0,
                "health": get("/health")["status"] == "ok",
            }
            if first["items"]:
                sample = first["items"][0]
                checks["details"] = get(f'/api/v1/books/{sample["id"]}')["id"] == sample["id"]
                checks["title_search"] = any(book["id"] == sample["id"] for book in get(
                    "/api/v1/books", {"q": sample["title"], "size": 100}
                )["items"])
            return {"status": "ok" if all(checks.values()) else "needs_attention",
                    "transport": "TestClient", "database": "real_neon_read_only",
                    "total": total, "pages_checked": pages, "checks": checks}
    except Exception as error:
        return {"status": "failed", "error_type": type(error).__name__}
    finally:
        engine.dispose()
        logging.disable(previous_logging)


if __name__ == "__main__":
    raise SystemExit(main())
