"""Проверяет оба подключения Neon, TLS и настоящий HTTP без вывода секретов."""
import json
from pathlib import Path
from urllib.parse import urlsplit
import httpx
from sqlalchemy import create_engine, text
from app.config import Settings

settings = Settings()
# Защита от случайного запуска отчета о Neon на локальной БД.
assert urlsplit(settings.database_url.replace('+psycopg', '')).hostname.endswith('.neon.tech')
result = {'service': 'Postgres', 'connections': {}}
for name, url in [('pooled', settings.database_url), ('direct', settings.migration_url)]:
    engine = create_engine(url, pool_pre_ping=True, connect_args={'connect_timeout': 20})
    with engine.connect() as connection:
        tls = bool(connection.connection.driver_connection.pgconn.ssl_in_use)
        assert tls, 'Для Neon обязательно защищенное соединение'
        result['connections'][name] = {
            'driver': engine.dialect.driver,
            'client_tls': tls,
            'revision': connection.scalar(text('SELECT version_num FROM alembic_version')),
            'books': connection.scalar(text('SELECT count(*) FROM books')),
            'active_books': connection.scalar(text('SELECT count(*) FROM books WHERE deleted_at IS NULL')),
            'users': connection.scalar(text('SELECT count(*) FROM users')),
            'loans': connection.scalar(text('SELECT count(*) FROM loans')),
        }
    engine.dispose()
# HTTP-проверка идет через тот же frontend proxy, что и браузер пользователя.
with httpx.Client(base_url='http://127.0.0.1:5176', timeout=30) as client:
    response = client.get('/api/v1/books')
    response.raise_for_status()
    result['http'] = {'catalog_status': response.status_code, 'total': response.json()['total']}
    response = client.get('/books/1')
    response.raise_for_status()
    result['http']['direct_spa_status'] = response.status_code
    result['http']['health_status'] = httpx.get('http://127.0.0.1:8002/health').status_code
print(json.dumps(result, indent=2))
Path('docs/neon').mkdir(exist_ok=True)
Path('docs/neon/verification.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
