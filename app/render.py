"""Один Render-сервис обслуживает API и собранный React без сервера разработки."""
import os
from pathlib import Path

from fastapi import HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.main import create_app


def create_render_app(static_dir: Path | None = None):
    # Путь можно передать тесту; в Docker сюда копируется результат npm run build.
    directory = (static_dir or Path(os.environ.get("STATIC_DIR", "/app/static"))).resolve()
    if not (directory / "index.html").is_file():
        raise RuntimeError("Сначала соберите React: index.html не найден")
    application = create_app()
    application.mount("/assets", StaticFiles(directory=directory / "assets"), name="assets")

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
