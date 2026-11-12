"""ЛР7/10: актуальный OpenAPI, безопасные ошибки и различие пропуска/null в PATCH."""
import json
import subprocess
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.schemas import ErrorRead
from tools.generate_api_types import render_types, typescript


def test_live_schema_snapshot_and_generated_types_match():
    """Снимок и TS проверяются против приложения, поэтому нельзя незаметно состарить оба файла."""
    actual = create_app().openapi()
    snapshot = json.loads(Path("docs/api/openapi.json").read_text(encoding="utf-8"))
    assert actual == snapshot
    # Выход допускает cookie/отсутствие access; /me по-прежнему требует Bearer.
    assert {} in actual["paths"]["/api/v1/auth/logout"]["post"]["security"]
    assert {} not in actual["paths"]["/api/v1/auth/me"]["get"]["security"]
    assert render_types(actual) == Path("react-app/src/api/generated.ts").read_text(encoding="utf-8")
    for path, item in actual["paths"].items():
        for method, operation in item.items():
            if method not in {"get", "post", "patch", "delete"}:
                continue
            for status in ["401", "403", "404", "405", "409", "422", "429", "500"]:
                assert operation["responses"][status]["content"]["application/json"]["schema"] == {"$ref": "#/components/schemas/ErrorRead"}, (path, method, status)
            if "204" in operation["responses"]:
                assert "content" not in operation["responses"]["204"]


@pytest.mark.parametrize("schema,expected", [
    ({"type": "string", "const": "returned"}, '"returned"'),
    ({"anyOf": [{"const": "returned"}, {"type": "null"}]}, '"returned" | null'),
    ({"type": "array", "items": {"anyOf": [{"type": "string"}, {"type": "integer"}]}}, '(string | number)[]'),
])
def test_generator_preserves_literal_and_nested_union(schema, expected):
    assert typescript(schema) == expected


def test_generator_check_does_not_rewrite_stale_file(tmp_path):
    """Код возврата позволяет ловить устаревшие типы, не исправляя их молча при проверке."""
    schema = tmp_path / "schema.json"
    output = tmp_path / "types.ts"
    source = {"components": {"schemas": {}}}
    schema.write_text(json.dumps(source), encoding="utf-8")
    output.write_text(render_types(source), encoding="utf-8")
    command = [sys.executable, "-X", "utf8", "tools/generate_api_types.py", "--schema", str(schema), "--output", str(output), "--check"]
    assert subprocess.run(command, capture_output=True).returncode == 0
    output.write_text("stale-types", encoding="utf-8")
    assert subprocess.run(command, capture_output=True).returncode == 1
    assert output.read_text(encoding="utf-8") == "stale-types"


@pytest.mark.parametrize("method,path,body,status", [
    ("get", "/api/v1/unknown-contract", None, 404),
    ("put", "/api/v1/books", {}, 405),
    ("get", "/api/v1/wishlist", None, 401),
    ("post", "/api/v1/auth/register", {"email": "not-email", "password": "PRIVATE-INPUT-MARKER", "role": "librarian"}, 422),
])
def test_error_envelope_headers_and_redaction(method, path, body, status):
    with TestClient(create_app()) as client:
        response = client.request(method, path, **({"json": body} if body is not None else {}))
    assert response.status_code == status
    error = ErrorRead.model_validate(response.json())
    assert error.code == f"HTTP_{status}" and error.request_id == response.headers["X-Request-ID"]
    assert response.headers["X-Process-Time-ms"]
    assert "PRIVATE-INPUT-MARKER" not in response.text
    if status == 405:
        assert "GET" in response.headers["Allow"]
    if status == 401:
        assert response.headers["WWW-Authenticate"] == "Bearer"
    if status == 422:
        assert error.details
        assert all(set(item) == {"loc", "msg", "type"} for item in response.json()["details"])


def test_internal_failure_does_not_expose_trace():
    app = create_app()
    @app.get("/contract-failure", include_in_schema=False)
    def fail():
        raise RuntimeError("PRIVATE-TRACE-MARKER")
    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/contract-failure")
    assert response.status_code == 500
    assert "PRIVATE-TRACE-MARKER" not in response.text and "Traceback" not in response.text
    assert ErrorRead.model_validate(response.json()).request_id == response.headers["X-Request-ID"]


def test_logout_without_access_matches_optional_security():
    """Повторный выход без access допустим; OpenAPI не должен требовать его безусловно."""
    with TestClient(create_app()) as client:
        response = client.post("/api/v1/auth/logout")
    assert response.status_code == 204 and response.content == b""
    assert "refresh_token=" in response.headers["set-cookie"]


def test_patch_schema_and_real_null_rules(db_client, db_author):
    """Пропуск полей сохраняет данные, null очищает только разрешенные поля."""
    schema = create_app().openapi()["components"]["schemas"]
    for model, nullable in [("BookUpdate", {"isbn"}), ("AuthorUpdate", {"birth_year"})]:
        assert not schema[model].get("required")
        for name, field in schema[model]["properties"].items():
            accepts_null = any(item.get("type") == "null" for item in field.get("anyOf", []))
            assert accepts_null == (name in nullable)
    response = db_client.post("/api/v1/books", json={"title": "Контракт PATCH", "author_id": db_author.id, "year": 2000, "isbn": "9780306406157"})
    assert response.status_code == 201
    book = response.json()
    path = f"/api/v1/books/{book['id']}"
    assert db_client.patch(path, json={}).json() == book
    assert db_client.patch(path, json={"title": None}).status_code == 422
    assert db_client.patch(path, json={"isbn": None}).json()["isbn"] is None
    author_path = f"/api/v1/authors/{db_author.id}"
    assert db_client.patch(author_path, json={"name": None}).status_code == 422
    assert db_client.patch(author_path, json={"birth_year": None}).json()["birth_year"] is None
    assert db_client.delete(path).status_code == 204
    assert db_client.get(path).status_code == 404
