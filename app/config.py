"""Общие параметры приложения читаются из окружения."""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    title: str = "BookNest API"
    version: str = "1.0.0"
    write_limit: int = 60
    cors_origins: list[str] = []
    database_url: str
    sql_echo: bool = False
    test_database_url: str | None = None
    # Секрет обязателен: без настройки приложение не должно стартовать с известным ключом.
    secret_key: str = Field(min_length=32)
    access_ttl_min: int = Field(default=15, ge=15, le=30)
    access_ttl_seconds: int | None = Field(default=None, ge=1, le=1800)
    refresh_ttl_days: int = Field(default=7, ge=1, le=7)
    cookie_secure: bool = False

    @field_validator("cors_origins")
    @classmethod
    def explicit_origins(cls, value: list[str]) -> list[str]:
        if "*" in value:
            raise ValueError("CORS требует явных origins")
        return value
