"""Общие параметры приложения читаются из окружения."""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator, model_validator
from urllib.parse import urlsplit


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", ".env.local"), extra="ignore")
    title: str = "BookNest API"
    version: str = "1.0.0"
    write_limit: int = 60
    cors_origins: list[str] = []
    # Render сообщает реальный адрес сервиса, в том числе при занятом имени booknest.
    render_external_url: str | None = None
    database_url: str
    # Neon выдает отдельный прямой URL для Alembic и резервных копий.
    database_url_unpooled: str | None = None
    sql_echo: bool = False
    test_database_url: str | None = None
    # Секрет обязателен: без настройки приложение не должно стартовать с известным ключом.
    secret_key: str = Field(min_length=32)
    access_ttl_min: int = Field(default=15, ge=15, le=30)
    access_ttl_seconds: int | None = Field(default=None, ge=1, le=1800)
    refresh_ttl_days: int = Field(default=7, ge=1, le=7)
    cookie_secure: bool = False
    # Учебный код разрешается печатать только при явном локальном запуске, не по умолчанию.
    log_email_confirmation: bool = False

    @field_validator("database_url", "database_url_unpooled", "test_database_url", mode="before")
    @classmethod
    def psycopg_driver(cls, value: str | None) -> str | None:
        # CLI выдает обычный Postgres URL; SQLAlchemy 2.0 иначе выбирает psycopg2.
        # Меняется только схема драйвера, пароль и параметры TLS остаются прежними.
        if value and value.startswith(("postgres://", "postgresql://")):
            return "postgresql+psycopg://" + value.split("://", 1)[1]
        return value

    @property
    def migration_url(self) -> str:
        # Локальная конфигурация и Compose продолжают работать с одним DATABASE_URL.
        return self.database_url_unpooled or self.database_url

    @field_validator("cors_origins")
    @classmethod
    def explicit_origins(cls, value: list[str]) -> list[str]:
        if "*" in value:
            raise ValueError("CORS требует явных origins")
        return value

    @model_validator(mode="after")
    def render_origin(self):
        # Явная настройка сохраняет приоритет. Локальная разработка не меняется.
        if not self.cors_origins and self.render_external_url:
            url = urlsplit(self.render_external_url)
            if (url.scheme != "https" or not url.hostname or url.username or url.password
                    or url.path not in ("", "/") or url.query or url.fragment):
                raise ValueError("RENDER_EXTERNAL_URL должен содержать только HTTPS origin")
            self.cors_origins = [self.render_external_url.rstrip("/")]
        return self
