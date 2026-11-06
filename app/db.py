"""Одна сессия на запрос; подключение задаётся только окружением."""

from collections.abc import Generator
from functools import lru_cache
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from app.config import Settings


@lru_cache
def get_session_factory() -> sessionmaker:
    settings = Settings()
    engine = create_engine(settings.database_url, echo=settings.sql_echo, pool_pre_ping=True)
    return sessionmaker(engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    # Закрытие сессии откатывает незавершённую транзакцию даже при исключении.
    with get_session_factory()() as session:
        yield session
