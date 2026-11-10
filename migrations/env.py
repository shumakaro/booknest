"""Окружение миграций получает URL из той же конфигурации, что и API."""

from alembic import context
from sqlalchemy import create_engine, pool
from app.config import Settings
from app.models import Base

target_metadata = Base.metadata


def run_migrations() -> None:
    settings = Settings()
    if context.is_offline_mode():
        context.configure(url=settings.migration_url, target_metadata=target_metadata, literal_binds=True)
        with context.begin_transaction():
            context.run_migrations()
    else:
        engine = create_engine(settings.migration_url, poolclass=pool.NullPool)
        with engine.connect() as connection:
            context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
            with context.begin_transaction():
                context.run_migrations()
        engine.dispose()


run_migrations()
