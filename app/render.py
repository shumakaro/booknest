"""Один Render-сервис обслуживает API и собранный React без сервера разработки."""
import os
import re
from pathlib import Path
from urllib.parse import urlsplit

from fastapi import HTTPException, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.gzip import GZipMiddleware
from starlette.types import Scope

from app.config import Settings
from app.main import create_app


# Vite добавляет восьмисимвольный хеш: изменение файла дает новый адрес.
HASHED_ASSET = re.compile(r".+-[A-Za-z0-9_-]{8}\.(?:js|css|woff2?|png|jpe?g|webp|svg|avif|ico)$")


class BuildAssets(StaticFiles):
    """Долгий кэш разрешен только успешно найденным файлам с версией в имени."""

    async def get_response(self, path: str, scope: Scope) -> Response:
        response = await super().get_response(path, scope)
        if response.status_code in {200, 206, 304}:
            response.headers["Cache-Control"] = (
                "public, max-age=31536000, immutable"
                if HASHED_ASSET.fullmatch(Path(path).name) else "no-cache"
            )
        return response


def create_render_app(static_dir: Path | None = None):
    # Путь можно передать тесту; в Docker сюда копируется результат npm run build.
    directory = (static_dir or Path(os.environ.get("STATIC_DIR", "/app/static"))).resolve()
    if not (directory / "index.html").is_file():
        raise RuntimeError("Сначала соберите React: index.html не найден")
    application = create_app()
    settings = Settings()
    canonical_host = urlsplit(settings.render_external_url).hostname if settings.render_external_url else None
    # Сжимаются только публичные файлы сборки: ответы с токенами и личные API не затрагиваются.
    application.mount("/assets", GZipMiddleware(
        BuildAssets(directory=directory / "assets"), minimum_size=1000, compresslevel=5,
    ), name="assets")

    @application.middleware("http")
    async def render_headers(request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Базовая политика не ломает CDN/inline-инициализацию Swagger и ReDoc.
        # Она ограничивает плагины, подмену base, встраивание и адрес отправки форм;
        # полноценную защиту script-src от XSS эта политика не обещает.
        response.headers["Content-Security-Policy"] = (
            "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
        )
        # На Render TLS завершается перед Uvicorn. Доверяем только проверенному
        # HTTPS origin из окружения и его host, а не присланному X-Forwarded-Proto.
        if request.url.scheme == "https" or (canonical_host and request.url.hostname == canonical_host):
            response.headers["Strict-Transport-Security"] = "max-age=31536000"
        return response

    @application.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        # Неизвестные API и файлы не должны маскировать ошибку HTML-страницей.
        if path.split("/", 1)[0] in {"api", "auth", "assets", "health", "docs", "openapi.json", "redoc"}:
            raise HTTPException(404, "Путь не найден")
        # Отдается только известная иконка, произвольный путь с диска не открывается.
        if path == "favicon.svg":
            return FileResponse(directory / "favicon.svg")
        if "." in path or "\\" in path:
            raise HTTPException(404, "Файл не найден")
        # Прямая ссылка /books/1 возвращает React; HTML не кэшируется между релизами.
        return FileResponse(directory / "index.html", headers={"Cache-Control": "no-store"})

    return application
