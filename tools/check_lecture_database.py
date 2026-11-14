"""Сравнивает DDL и миграции только в новых локальных учебных базах.

Адрес Neon не читается. Пароль существующего локального кластера берется
из приватного файла и не попадает ни в команды, ни в публичный протокол.
Созданные базы сохраняются; повторное имя приводит к отказу без перезаписи.
"""
import io
import json
import os
from contextlib import redirect_stdout
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
import psycopg
from psycopg import sql

ROOT = Path(__file__).resolve().parents[1]


class Utf8Buffer(io.StringIO):
    """Alembic использует encoding потока для русских описаний ревизий."""
    @property
    def encoding(self) -> str:
        return "utf-8"


def schema(connection: psycopg.Connection) -> dict:
    """Возвращает характеристики схемы без пользовательских строк."""
    columns = connection.execute("""
        SELECT table_name,column_name,data_type,udt_name,is_nullable,
               column_default,is_identity,identity_generation,
               character_maximum_length
        FROM information_schema.columns WHERE table_schema='public'
        AND table_name <> 'alembic_version' ORDER BY table_name,ordinal_position
    """).fetchall()
    constraints = connection.execute("""
        SELECT c.relname,con.contype,pg_get_constraintdef(con.oid)
        FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid
        JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
        AND c.relname <> 'alembic_version' ORDER BY 1,2,3
    """).fetchall()
    return {"columns": columns, "constraints": constraints}


def main() -> None:
    """Создает два отсутствующих scratch-объекта и проверяет их независимо."""
    password = (ROOT / ".tools/pg-password").read_text().strip()
    stamp = datetime.now(timezone.utc).strftime("%m%d%H%M%S") + uuid4().hex[:4]
    names = [f"booknest_lect_{stamp}_ddl_test", f"booknest_lect_{stamp}_orm_test"]
    options = dict(host="127.0.0.1", port=55432, user="booknest", password=password, connect_timeout=5)
    with psycopg.connect(**options, dbname="postgres", autocommit=True) as admin:
        for name in names:
            assert not admin.execute("SELECT 1 FROM pg_database WHERE datname=%s", (name,)).fetchone()
        for name in names:
            admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))
    with psycopg.connect(**options, dbname=names[0], autocommit=True) as db:
        db.execute((ROOT / "db/schema.sql").read_text(encoding="utf-8-sig"))
        db.execute((ROOT / "db/seed.sql").read_text(encoding="utf-8-sig"))
        ddl = schema(db)
        source = "\n".join(line for line in (ROOT / "db/queries.sql").read_text(encoding="utf-8-sig").splitlines()
                           if not line.lstrip().startswith("--"))
        queries = [s.strip() for s in source.split(";") if s.strip()]
        results = [{"number": i, "sql": q, "rows": len(db.execute(q).fetchall())}
                   for i, q in enumerate(queries, 1)]
        count = db.execute("SELECT count(*) FROM books").fetchone()[0]
        version = db.execute("SELECT version()").fetchone()[0]
        base_tables = [r[0] for r in db.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1"
        ).fetchall()]
    # Alembic и ORM получают только локальную scratch-БД через окружение процесса.
    # Файлы окружения приложения не открываются для записи.
    from urllib.parse import quote
    url = f"postgresql+psycopg://booknest:{quote(password, safe='')}@127.0.0.1:55432/{names[1]}"
    os.environ.update(DATABASE_URL=url, DATABASE_URL_UNPOOLED=url,
                      TEST_DATABASE_URL=url, SECRET_KEY="lecture-test-only-key-that-is-longer-than-thirty-two",
                      CORS_ORIGINS='["http://testserver"]')
    from alembic import command
    from alembic.config import Config
    output = Utf8Buffer()
    cfg = Config(str(ROOT / "alembic.ini"), stdout=output)
    command.upgrade(cfg, "001_schema")
    with psycopg.connect(**options, dbname=names[1], autocommit=True) as db:
        initial = schema(db)
        assert initial == ddl, "Начальная миграция отличается от DDL"
        db.execute((ROOT / "db/seed.sql").read_text(encoding="utf-8-sig"))
        db.execute("UPDATE profiles SET full_name='Имя  Фамилия ' WHERE user_id=1")
        original_names = db.execute("SELECT user_id,full_name FROM profiles ORDER BY user_id").fetchall()
    command.upgrade(cfg, "head")
    with redirect_stdout(output):
        command.check(cfg)
        command.history(cfg)
    command.downgrade(cfg, "001_schema")
    with psycopg.connect(**options, dbname=names[1]) as db:
        assert db.execute("SELECT user_id,full_name FROM profiles ORDER BY user_id").fetchall() == original_names
    command.upgrade(cfg, "head")
    with psycopg.connect(**options, dbname=names[1]) as db:
        current = schema(db)
        assert db.execute("SELECT count(*) FROM books").fetchone()[0] == count == 30
        revision = db.execute("SELECT version_num FROM alembic_version").fetchone()[0]
    assert len(queries) >= 10
    target = ROOT / "docs/lectures/lecture-10-11-db-validation.json"
    data = {"date_utc": datetime.now(timezone.utc).isoformat(), "local_postgresql": version,
            "scratch_databases": names, "production_connections": 0, "existing_databases_modified": False,
            "env_files_modified": False, "scratch_databases_deleted": False,
            "book_rows": count, "base_tables": base_tables, "columns_include_views": True,
            "sql_queries": results, "initial_ddl_equals_migration_001": True,
            "initial_schema": ddl, "current_schema": current,
            "current_revision": revision, "metadata_check": output.getvalue(),
            "upgrade_downgrade_upgrade": True, "names_including_spaces_preserved": True}
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"tables": len(base_tables),
                      "constraints": len(ddl["constraints"]), "queries": len(results),
                      "book_rows": count, "revision": revision, "schema_comparison": "OK"}))


if __name__ == "__main__":
    main()
