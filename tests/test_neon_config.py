"""Проверяет совместимость URL Neon без сетевых запросов и настоящих секретов."""
from sqlalchemy.engine import make_url
from app.config import Settings


def test_neon_urls_keep_tls_and_encoded_password():
    # Символы пароля нельзя повторно декодировать или терять при выборе драйвера.
    settings = Settings(
        _env_file=None, secret_key="test-key-only-" * 4,
        database_url="postgresql://reader:p%40ss%2Bword@pooled.example.test/books?sslmode=require",
        database_url_unpooled="postgres://owner:p%40ss%2Bword@direct.example.test/books?sslmode=require",
    )
    pooled = make_url(settings.database_url)
    direct = make_url(settings.migration_url)
    assert pooled.drivername == direct.drivername == "postgresql+psycopg"
    assert pooled.password == direct.password == "p@ss+word"
    assert pooled.query["sslmode"] == direct.query["sslmode"] == "require"
    assert pooled.host == "pooled.example.test"
    assert direct.host == "direct.example.test"


def test_local_configuration_needs_no_neon_direct_url():
    settings = Settings(
        _env_file=None, secret_key="test-key-only-" * 4,
        database_url="postgresql+psycopg://reader:example@localhost/books",
        database_url_unpooled=None,
    )
    assert settings.migration_url == settings.database_url
