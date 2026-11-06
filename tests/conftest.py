"""API-тесты используют отдельную БД и откат внешней транзакции."""

import os
import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session
from app.config import Settings
from app.db import get_db
from app.main import create_app
from app.models import Author, User


@pytest.fixture(scope="session")
def test_engine():
    settings = Settings()
    if not settings.test_database_url:
        pytest.skip("TEST_DATABASE_URL не задан; тесты БД не подменяются SQLite")
    test_url = make_url(settings.test_database_url)
    # Двойная проверка защищает рабочую БД от ошибочной конфигурации тестов.
    if not test_url.database.endswith("_test") or settings.test_database_url == settings.database_url:
        raise RuntimeError("Тестовая БД должна быть отдельной и оканчиваться на _test")
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = settings.test_database_url
    try:
        command.upgrade(Config("alembic.ini"), "head")
    finally:
        if previous is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = previous
    engine = create_engine(settings.test_database_url)
    yield engine
    engine.dispose()


@pytest.fixture
def db(test_engine):
    with test_engine.connect() as connection:
        transaction = connection.begin()
        with Session(
            bind=connection, expire_on_commit=False, join_transaction_mode="create_savepoint"
        ) as session:
            yield session
        transaction.rollback()


@pytest.fixture
def db_client(db):
    application = create_app()

    def override_db():
        yield db

    application.dependency_overrides[get_db] = override_db
    with TestClient(application) as client:
        yield client
    application.dependency_overrides.clear()


@pytest.fixture
def db_author(db):
    author = Author(name="Автор тестирования")
    db.add(author)
    db.commit()
    return author


@pytest.fixture
def db_reader(db):
    reader = User(email="reader@example.test", password_hash="disabled-test-account", role="member")
    db.add(reader)
    db.commit()
    return reader
