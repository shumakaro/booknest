"""Проверяет лекцию 9 в памяти и запрещает любые соединения с БД."""

from datetime import datetime, timezone
import json
import os
from pathlib import Path
import faulthandler
import argparse
from copy import deepcopy
import time
from uuid import uuid4
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = ROOT / ".tools/lecture09"
OUT = ROOT / "docs/lectures"


def main() -> int:
    """Файлы окружения не меняются: тестовые значения действуют только в процессе."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--report-name", choices=["lecture-09-validation", "lecture-09-contract-before"],
                        default="lecture-09-validation")
    parser.add_argument("--update-openapi-errors", action="store_true",
                        help="Разрешить только добавление описаний 502/503/504 в discover")
    options = parser.parse_args()
    PRIVATE.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    os.chdir(ROOT)
    os.environ.update({
        "DATABASE_URL": "postgresql+psycopg://disabled:disabled@127.0.0.1:1/booknest_unused",
        "DATABASE_URL_UNPOOLED": "postgresql+psycopg://disabled:disabled@127.0.0.1:1/booknest_unused",
        "TEST_DATABASE_URL": "postgresql+psycopg://disabled:disabled@127.0.0.1:1/booknest_unused_test",
        "SECRET_KEY": "lecture09-isolated-process-check-2026",
        "CORS_ORIGINS": '["http://testserver"]',
        "WRITE_LIMIT": "10000",
        "SQL_ECHO": "false",
    })
    print("Подготовлено изолированное окружение проверки", flush=True)
    from sqlalchemy.engine import Engine
    from fastapi.testclient import TestClient
    import pytest

    attempts = []
    original_connect = Engine.connect

    def forbidden_connect(self: Engine, *args: object, **kwargs: object) -> None:
        attempts.append("blocked")
        raise AssertionError("Проверка лекции 9 не должна обращаться к БД")

    Engine.connect = forbidden_connect
    try:
        from app.legacy import create_app as memory_app
        from app.main import create_app
        from app.schemas.auth import UserRead
        from tools.generate_api_types import render_types

        application = create_app()
        schema = application.openapi()
        print("OpenAPI получен без обращения к БД", flush=True)
        saved = json.loads((ROOT / "docs/api/openapi.json").read_text(encoding="utf-8"))
        if options.update_openapi_errors:
            # Проверяется, что изменение снимка действительно только аддитивное.
            reduced = deepcopy(schema)
            for path, method in [
                ("/api/v1/discover/books", "get"),
                ("/api/v1/discover/books/{work_id}", "get"),
                ("/api/v1/discover/imports", "post"),
            ]:
                for status in ["502", "503", "504"]:
                    reduced["paths"][path][method]["responses"].pop(status, None)
            assert reduced == saved, "В снимке есть изменения кроме разрешенных описаний ошибок"
            (ROOT / "docs/api/openapi.json").write_text(
                json.dumps(schema, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
            saved = schema
        assert schema == saved, "OpenAPI приложения отличается от сохраненного контракта"
        assert render_types(schema) == (ROOT / "react-app/src/api/generated.ts").read_text(encoding="utf-8")
        operations = []
        for path, methods in schema["paths"].items():
            for method, operation in methods.items():
                if method not in {"get", "post", "patch", "delete"}:
                    continue
                operations.append({
                    "method": method.upper(), "path": path, "operation_id": operation["operationId"],
                    "summary": operation.get("summary", ""),
                    "responses": sorted(operation["responses"]),
                    "success_codes": sorted(k for k in operation["responses"] if k.startswith("2")),
                    "bearer_required": bool(operation.get("security")) and {} not in operation["security"],
                })
        evidence = []
        with TestClient(memory_app()) as client:
            def record(method: str, path: str, expected: int, **kwargs: object) -> object:
                response = client.request(method, path, **kwargs)
                assert response.status_code == expected, (method, path, response.status_code)
                entry = {"method": method, "path": path, "status": response.status_code,
                         "request_id_present": bool(response.headers.get("X-Request-ID"))}
                if response.headers.get("content-type", "").startswith("application/json"):
                    entry["body"] = response.json()
                else:
                    entry["body_bytes"] = len(response.content)
                evidence.append(entry)
                return response

            record("GET", "/health", 200)
            docs = record("GET", "/docs", 200)
            assert "swagger-ui" in docs.text
            author = record("POST", "/api/v1/authors", 201, json={"name": "Автор проверки лекции"}).json()
            payload = {
                "title": "Учебная книга", "author_id": author["id"], "year": 2020,
                "isbn": "9780306406157", "genre": "fiction", "total_copies": 1,
                "publisher": "Учебное издательство", "language": "ru", "edition_year": 2021, "pages": 200,
            }
            book = record("POST", "/api/v1/books", 201, json=payload).json()
            record("POST", "/api/v1/books", 409, json=payload)
            invalid = record("POST", "/api/v1/books", 422, json={**payload, "year": "давно"}).json()
            assert set(invalid) == {"code", "message", "details", "request_id"}
            assert all(set(issue) == {"loc", "msg", "type"} for issue in invalid["details"])
            record("GET", "/api/v1/books?q=Учебная&page=1&size=1", 200)
            record("GET", "/api/v1/books/999", 404)
            path = f"/api/v1/books/{book['id']}"
            updated = record("PATCH", path, 200, json={"title": "Уточненное название"}).json()
            assert all(updated[k] == v for k, v in book.items() if k != "title")
            deleted = record("DELETE", path, 204)
            assert deleted.content == b""
            record("GET", path, 404)
        print("HTTP-сценарии API в памяти завершены", flush=True)

        public_user = UserRead.model_validate({
            "id": 1, "email": "reader@example.test", "role": "member",
            "is_active": True, "email_verified": False, "password_hash": "TEST-ONLY-HIDDEN-FIELD",
        }).model_dump()
        assert "password_hash" not in public_user
        # Выбираются только тесты, не требующие db_client/test_engine.
        # Запрет Engine.connect остается активным и выявит ошибку выбора.
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid4().hex[:8]
        args = [
            "tests/test_catalog.py", "tests/test_api_contracts.py", "tests/test_discover.py",
            "-k", "not test_patch_schema_and_real_null_rules", "-q",
            "--basetemp=" + str(PRIVATE / ("pytest-" + stamp)),
            "--junitxml=" + str(PRIVATE / "pytest.xml"),
        ]
        started = time.perf_counter()
        code = pytest.main(args)
        elapsed = round(time.perf_counter() - started, 2)
        report = ET.parse(PRIVATE / "pytest.xml").getroot()
        suites = list(report.iter("testsuite"))
        counters = {key: sum(int(s.get(key, "0")) for s in suites)
                    for key in ["tests", "failures", "errors", "skipped"]}
        assert not attempts, "Проверки запросили соединение с БД"
        result = {
            "date_utc": datetime.now(timezone.utc).isoformat(),
            "baseline": "605d0d5", "branch": "codex/lecture-09-materials",
            "scope": "in-process memory API and production OpenAPI without DB connections",
            "pytest_args": args[:-2], "pytest_exit_code": int(code), "pytest_seconds": elapsed,
            "pytest": counters, "database_connection_attempts": len(attempts),
            "database_writes": False, "environment_files_modified": False,
            "deployment_performed": False, "public_http_requests": False,
            "openapi_matches_snapshot": True, "generated_types_match": True,
            "paths": len(schema["paths"]), "operations": operations,
            "memory_http_cases": evidence, "user_read_filters_service_field": True,
            "swagger_html_served": True, "swagger_browser_screenshot_taken": False,
        }
        (OUT / (options.report_name + ".json")).write_text(
            json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(json.dumps({"pytest": counters, "database_connection_attempts": 0,
                          "paths": len(schema["paths"]), "operations": len(operations),
                          "memory_http_cases": len(evidence)}, ensure_ascii=False))
        return int(code)
    finally:
        Engine.connect = original_connect
        faulthandler.cancel_dump_traceback_later()


if __name__ == "__main__":
    # При зависании сохраняется стек только этого тестового процесса, не секреты.
    faulthandler.dump_traceback_later(45)
    raise SystemExit(main())
