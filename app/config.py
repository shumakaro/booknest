"""Общие параметры приложения читаются из окружения."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    title: str = "BookNest API"
    version: str = "1.0.0"
    write_limit: int = 60
    cors_origins: list[str] = []
    database_url: str
    sql_echo: bool = False
    test_database_url: str | None = None
