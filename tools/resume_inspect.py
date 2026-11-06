"""Проверка после остановки: только чтение состояния, без миграций и наполнения."""
import json
from pathlib import Path
import httpx
import psycopg
from app.config import Settings

settings = Settings()
root = settings.database_url.replace('+psycopg', '').rsplit('/', 1)[0]
result = {}
for name in ['booknest', 'booknest_test', 'booknest_sql', 'booknest_restore', 'booknest_migration_test']:
    with psycopg.connect(root + '/' + name, connect_timeout=5, options='-c default_transaction_read_only=on') as db:
        counts = db.execute('SELECT (SELECT count(*) FROM authors), (SELECT count(*) FROM books), (SELECT count(*) FROM users), (SELECT count(*) FROM loans)').fetchone()
        has_revision = db.execute("SELECT to_regclass('public.alembic_version')").fetchone()[0]
        revision = db.execute('SELECT version_num FROM alembic_version').fetchall() if has_revision else []
        result[name] = {'authors': counts[0], 'books': counts[1], 'users': counts[2], 'loans': counts[3], 'revisions': revision}
try:
    response = httpx.get('http://127.0.0.1:8000/api/v1/books', timeout=5)
    result['running_api'] = {'status': response.status_code, 'total': response.json().get('total')}
except httpx.HTTPError as error:
    result['running_api'] = type(error).__name__
Path('docs/lab8/resume-state.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(result, ensure_ascii=False, indent=2))
