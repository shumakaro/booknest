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
    (tmp_path / "assets" / "app-Ab12Cd34.js").write_text("console.log('versioned')")
    (tmp_path / "assets" / "large-Ab12Cd34.js").write_text("/* public build asset */" * 100)
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


def test_versioned_asset_cache_and_conditional_request(web):
    response = web.get("/assets/app-Ab12Cd34.js")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "public, max-age=31536000, immutable"
    cached = web.get("/assets/app-Ab12Cd34.js", headers={"If-None-Match": response.headers["etag"]})
    assert cached.status_code == 304
    assert cached.content == b""
    assert cached.headers["cache-control"] == response.headers["cache-control"]
    # Файл без версии обязан перепроверяться; отсутствующий файл не получает годовой кэш.
    assert web.get("/assets/app.js").headers["cache-control"] == "no-cache"
    assert "immutable" not in web.get("/assets/missing-Ab12Cd34.js").headers.get("cache-control", "")


def test_asset_cache_does_not_override_private_response_policy(web):
    response = web.get("/assets/app-Ab12Cd34.js", headers={"Authorization": "Bearer test-placeholder"})
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("path", ["/books", "/health", "/assets/app.js", "/assets/missing.js", "/docs", "/redoc"])
def test_render_security_headers_preserve_api_and_documentation(web, path):
    response = web.get(path)
    assert response.status_code == (404 if path == "/assets/missing.js" else 200)
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert "frame-ancestors 'none'" in response.headers["content-security-policy"]
    # Отсутствие script-src/default-src здесь намеренное: Swagger использует CDN и inline JS.
    assert "script-src" not in response.headers["content-security-policy"]


def test_hsts_uses_https_origin_and_ignores_forwarded_header(web, monkeypatch, tmp_path):
    monkeypatch.delenv("RENDER_EXTERNAL_URL", raising=False)
    # Обычный HTTP и поддельный заголовок не включают HSTS.
    with TestClient(create_render_app(tmp_path)) as local:
        response = local.get("/health", headers={"X-Forwarded-Proto": "https"})
        assert "strict-transport-security" not in response.headers
        assert local.get("https://testserver/health").headers["strict-transport-security"] == "max-age=31536000"
    monkeypatch.setenv("RENDER_EXTERNAL_URL", "https://booknest-test.onrender.com")
    with TestClient(create_render_app(tmp_path), base_url="http://booknest-test.onrender.com") as proxied:
        assert proxied.get("/health").headers["strict-transport-security"] == "max-age=31536000"
        assert "strict-transport-security" not in proxied.get(
            "/health", headers={"Host": "localhost"}
        ).headers


@pytest.mark.parametrize("status", [401, 403])
def test_access_denials_without_authorization_header_are_not_cached(status):
    from fastapi import HTTPException
    from app.main import create_app

    application = create_app()

    @application.get("/api/v1/test-denied")
    def denied():
        raise HTTPException(status, "Доступ запрещен")

    with TestClient(application) as client:
        response = client.get("/api/v1/test-denied")
        assert response.status_code == status
        assert response.headers["cache-control"] == "no-store"


def test_gzip_negotiation_only_for_public_build_files(web):
    packed = web.get("/assets/large-Ab12Cd34.js", headers={"Accept-Encoding": "gzip"})
    plain = web.get("/assets/large-Ab12Cd34.js", headers={"Accept-Encoding": "identity"})
    assert packed.status_code == plain.status_code == 200
    assert packed.content == plain.content
    assert packed.headers["content-encoding"] == "gzip"
    assert "accept-encoding" in packed.headers["vary"].lower()
    assert "content-encoding" not in plain.headers
    assert int(packed.headers["content-length"]) < int(plain.headers["content-length"])
    assert "immutable" in packed.headers["cache-control"]
    # API и HTML не попадают под middleware сжатия публичных файлов.
    assert "content-encoding" not in web.get("/health").headers
    assert "content-encoding" not in web.get("/books").headers
