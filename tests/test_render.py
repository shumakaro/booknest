"""Приемка единого HTTP-входа Render без обращения к рабочей базе Neon."""
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import Settings
from app.render import create_render_app


@pytest.fixture
def web(tmp_path):
    # Временные файлы проверяют именно раздачу сборки, не подменяют API-данные.
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "app.js").write_text("console.log('build')")
    (tmp_path / "index.html").write_text("<html>BookNest production</html>")
    (tmp_path / "favicon.svg").write_text("<svg></svg>")
    with TestClient(create_render_app(tmp_path)) as client:
        yield client


@pytest.mark.parametrize("path", ["/", "/books/1", "/wishlist"])
def test_spa_direct_links(web, path):
    response = web.get(path)
    assert response.status_code == 200
    assert "BookNest production" in response.text
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("path", ["/api/v1/missing", "/auth/missing", "/assets/missing.js", "/.env", "/missing.js"])
def test_missing_resources_are_not_html(web, path):
    response = web.get(path)
    assert response.status_code == 404
    assert "text/html" not in response.headers["content-type"]


def test_static_assets_and_api_health(web):
    assert web.get("/assets/app.js").text == "console.log('build')"
    assert web.get("/favicon.svg").headers["content-type"].startswith("image/svg+xml")
    assert web.get("/health").json() == {"status": "ok"}


def test_render_uses_actual_https_origin(monkeypatch):
    # В тесте окружение не наследует локальный список адресов разработки.
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    settings = Settings(_env_file=None, cors_origins=[], render_external_url="https://booknest-test.onrender.com/",
                        database_url="postgresql://localhost/books", secret_key="test-key-only-" * 4)
    assert settings.cors_origins == ["https://booknest-test.onrender.com"]
    explicit = Settings(_env_file=None, cors_origins=["https://example.test"],
                        render_external_url="https://booknest-test.onrender.com",
                        database_url="postgresql://localhost/books", secret_key="test-key-only-" * 4)
    assert explicit.cors_origins == ["https://example.test"]


def test_render_rejects_invalid_origin():
    with pytest.raises(ValidationError):
        Settings(_env_file=None, cors_origins=[], render_external_url="http://example.test/path",
                 database_url="postgresql://localhost/books", secret_key="test-key-only-" * 4)
