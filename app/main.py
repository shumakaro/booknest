"""Точка входа учебного REST API."""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import Settings
from app.core.http import configure_http
from app.routers.loans import router as loans_router
from app.routers.catalog_db import router
from app.schemas import HealthRead


def create_app() -> FastAPI:
    # Отдельное приложение удобно создавать для каждого теста.
    settings = Settings()
    application = FastAPI(
        title=settings.title, version=settings.version, description="Учебный REST API книжного клуба BookNest"
    )
    # Данные хранятся в PostgreSQL; схема создаётся только миграциями.
    configure_http(application, settings.write_limit)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )
    application.include_router(router, prefix="/api/v1")
    application.include_router(loans_router, prefix="/api/v1")

    @application.get("/health", response_model=HealthRead, status_code=200, tags=["service"])
    def health() -> dict:
        """Проверить, что процесс сервера отвечает."""
        return {"status": "ok"}

    return application


logging.basicConfig(level=logging.INFO)
app = create_app()
