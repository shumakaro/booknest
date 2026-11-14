"""Создает приватную копию public-схемы Neon и проверяет ее в новой локальной БД."""

import argparse
import hashlib
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import psycopg
from psycopg import sql
from sqlalchemy.engine import URL, make_url

from app.config import Settings


class SafetyError(Exception):
    """Содержит только заранее заданный код, без текста драйвера и подключения."""


def validate_connections(source: URL, local: URL, target: str) -> None:
    """Дамп читается напрямую из Neon, восстановление разрешено только на loopback."""
    if (not (source.host or "").endswith(".neon.tech") or "-pooler" in source.host
            or source.query.get("sslmode") not in {"require", "verify-ca", "verify-full"}):
        raise SafetyError("direct_neon_tls_required")
    if local.host not in {"localhost", "127.0.0.1", "::1"} or not (local.database or "").endswith("_test"):
        raise SafetyError("local_test_connection_required")
    if not re.fullmatch(r"booknest_[a-z0-9]{1,25}_restore_test", target) or target == local.database:
        raise SafetyError("new_restore_test_name_required")


def private_directory(root: Path, path: Path) -> Path:
    """Копии должны оставаться внутри игнорируемых backups/ или .tools/ этого проекта."""
    root, path = root.resolve(), path.resolve()
    if not path.is_relative_to(root) or path.relative_to(root).parts[:1] not in {("backups",), (".tools",)}:
        raise SafetyError("private_workspace_directory_required")
    ignored = subprocess.run(
        ["git", "check-ignore", "--quiet", "--", str(path.relative_to(root) / "probe.dump")],
        cwd=root, capture_output=True, check=False,
    )
    if ignored.returncode != 0:
        raise SafetyError("backup_directory_must_be_gitignored")
    return path


def connection_options(url: URL, database: str | None = None) -> dict:
    """Разбор URL выполняется библиотекой: экранированный пароль не меняется вручную."""
    options = {"host": url.host, "port": url.port or 5432, "user": url.username,
               "password": url.password or "", "dbname": database or url.database, "connect_timeout": 15}
    for key in ("sslmode", "channel_binding", "sslrootcert", "sslcert", "sslkey"):
        if key in url.query:
            options[key] = url.query[key]
    return options


def child_environment(options: dict) -> dict[str, str]:
    """Секрет передается libpq в окружении дочернего процесса, никогда не через argv."""
    env = {key: value for key, value in os.environ.items() if not key.upper().startswith("PG")}
    mapping = {"host": "PGHOST", "port": "PGPORT", "user": "PGUSER", "password": "PGPASSWORD",
               "dbname": "PGDATABASE", "connect_timeout": "PGCONNECT_TIMEOUT", "sslmode": "PGSSLMODE",
               "channel_binding": "PGCHANNELBINDING", "sslrootcert": "PGSSLROOTCERT",
               "sslcert": "PGSSLCERT", "sslkey": "PGSSLKEY"}
    env.update({mapping[key]: str(value) for key, value in options.items() if value is not None})
    env["PGAPPNAME"] = "BookNest backup verification"
    env["PGTZ"] = "UTC"
    return env


def run_tool(command: list[str], env: dict, private_log: Path) -> None:
    result = subprocess.run(command, env=env, capture_output=True, timeout=240, check=False)
    # Даже при ошибке COPY stderr может содержать данные строки. Он остается только локально.
    with private_log.open("xb") as log:
        log.write(result.stderr)
    if result.returncode:
        raise SafetyError(Path(command[0]).stem + "_failed")


def fingerprint(connection: psycopg.Connection) -> dict:
    """Сравнивает содержимое внутри БД; наружу не выгружаются строки или их значения."""
    connection.execute("SET LOCAL TIME ZONE 'UTC'")
    connection.execute("SET LOCAL statement_timeout = '15s'")
    names = [row[0] for row in connection.execute(
        "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    )]
    tables = {}
    for name in names:
        count, digest = connection.execute(sql.SQL(
            "SELECT count(*), md5(coalesce(string_agg(to_jsonb(t)::text, E'\\n' "
            "ORDER BY to_jsonb(t)::text COLLATE \"C\"), '')) FROM public.{} AS t"
        ).format(sql.Identifier(name))).fetchone()
        tables[name] = {"rows": count, "digest": digest}
    revisions = sorted(row[0] for row in connection.execute("SELECT version_num FROM public.alembic_version"))
    return {"tables": tables, "revision": revisions}


def require_new_database(admin: psycopg.Connection, target: str) -> None:
    if admin.execute("SELECT 1 FROM pg_database WHERE datname=%s", (target,)).fetchone():
        raise SafetyError("restore_target_already_exists")


def verify_backup(args: argparse.Namespace) -> dict:
    root = Path.cwd().resolve()
    if args.report.exists():
        raise SafetyError("report_already_exists")
    private = private_directory(root, args.private_dir)
    settings = Settings()
    if not settings.database_url_unpooled or not settings.test_database_url:
        raise SafetyError("source_and_local_test_configuration_required")
    source, local = make_url(settings.database_url_unpooled), make_url(settings.test_database_url)
    validate_connections(source, local, args.restore_name)
    dump_binary = args.pg_bin / "pg_dump.exe"
    restore_binary = args.pg_bin / "pg_restore.exe"
    if not dump_binary.is_file() or not restore_binary.is_file():
        raise SafetyError("postgres_client_tools_required")
    version = subprocess.run([str(dump_binary), "--version"], capture_output=True, text=True, check=True)
    tool_major = int(re.search(r"(\d+)\.", version.stdout).group(1))
    # До чтения production убеждаемся, что новая локальная БД действительно может быть создана.
    with psycopg.connect(**connection_options(local, "postgres"), autocommit=True) as admin:
        require_new_database(admin, args.restore_name)
        if not admin.execute("SELECT rolcreatedb OR rolsuper FROM pg_roles WHERE rolname=current_user").fetchone()[0]:
            raise SafetyError("local_createdb_permission_required")
        with psycopg.connect(**connection_options(source)) as connection:
            connection.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
            if not connection.pgconn.ssl_in_use:
                raise SafetyError("source_client_tls_required")
            source_major = int(connection.execute("SHOW server_version_num").fetchone()[0]) // 10000
            if source_major > tool_major:
                raise SafetyError("pg_dump_is_older_than_source_server")
            if int(admin.execute("SHOW server_version_num").fetchone()[0]) // 10000 < source_major:
                raise SafetyError("restore_server_is_older_than_source_server")
            before = fingerprint(connection)
            snapshot = connection.execute("SELECT pg_export_snapshot()").fetchone()[0]
            folder = private / (datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid4().hex[:8])
            folder.mkdir(parents=True, exist_ok=False)
            archive = folder / "booknest-public.dump"
            # Экспортированный снимок фиксирует один набор строк даже при параллельной работе сайта.
            run_tool([str(dump_binary), "--no-password", "--format=custom", "--schema=public",
                      "--no-owner", "--no-privileges", "--snapshot=" + snapshot, "--file=" + str(archive)],
                     child_environment(connection_options(source)), folder / "dump-private.log")
        archive_hash = hashlib.sha256(archive.read_bytes()).hexdigest()
        (folder / "booknest-public.dump.sha256").write_text(archive_hash + "\n", encoding="ascii")
        require_new_database(admin, args.restore_name)
        admin.execute(sql.SQL("CREATE DATABASE {} TEMPLATE template0").format(sql.Identifier(args.restore_name)))
        run_tool([str(restore_binary), "--no-password", "--no-owner", "--no-privileges", "--exit-on-error",
                  "--single-transaction", "--dbname=" + args.restore_name, str(archive)],
                 child_environment(connection_options(local, args.restore_name)), folder / "restore-private.log")
    with psycopg.connect(**connection_options(local, args.restore_name)) as restored:
        restored.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
        after = fingerprint(restored)
    matches = before == after
    return {
        "status": "ok" if matches else "needs_attention",
        "checked_at_utc": datetime.now(timezone.utc).isoformat(),
        "scope": "existing_neon_public_schema", "source_snapshot_used": True,
        "source_read_only": True, "source_client_tls": True, "production_writes": False,
        "restore_database_is_new_and_local": True, "restore_target": args.restore_name,
        "revision": before["revision"], "archive_sha256": archive_hash,
        "all_table_contents_match": matches,
        "tables": {name: {"source_rows": data["rows"], "restored_rows": after["tables"].get(name, {}).get("rows"),
                          "contents_match": data == after["tables"].get(name)}
                   for name, data in before["tables"].items()},
        "private_dump_in_git": False, "automatic_schedule_installed": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--restore-name", required=True)
    parser.add_argument("--private-dir", type=Path, default=Path("backups/neon"))
    parser.add_argument("--pg-bin", type=Path, default=Path(".tools/postgresql/pgsql/bin"))
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    try:
        result = verify_backup(args)
    except SafetyError as error:
        print(json.dumps({"status": "refused", "reason": str(error)}))
        return 1
    except Exception as error:
        # Текст исключения драйвера может раскрыть адрес или SQL; он не печатается.
        print(json.dumps({"status": "failed", "error_type": type(error).__name__}))
        return 1
    args.report.parent.mkdir(parents=True, exist_ok=True)
    with args.report.open("x", encoding="utf-8") as report:
        report.write(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["status"] == "ok" else 1


if __name__ == "__main__":
    raise SystemExit(main())
