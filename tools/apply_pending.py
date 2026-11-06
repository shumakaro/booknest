"""Применяет только новые ревизии после чтения текущего состояния; без seed и reset."""
from pathlib import Path
from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, text, inspect
from app.config import Settings

settings=Settings()
engine=create_engine(settings.database_url)
cfg=Config('alembic.ini')
heads=set(ScriptDirectory.from_config(cfg).get_heads())
with engine.connect() as db:
    current=set(db.scalars(text('SELECT version_num FROM alembic_version'))) if inspect(db).has_table('alembic_version') else set()
    before=db.execute(text('SELECT (SELECT count(*) FROM books),(SELECT count(*) FROM users),(SELECT count(*) FROM loans)')).one() if inspect(db).has_table('books') else None
if current == heads:
    print('Миграции уже актуальны; изменений нет')
else:
    print('Новые ревизии:',','.join(current),'->',','.join(heads))
    command.upgrade(cfg,'head')
with engine.connect() as db:
    after=db.execute(text('SELECT (SELECT count(*) FROM books),(SELECT count(*) FROM users),(SELECT count(*) FROM loans)')).one()
if before is not None:
    assert before==after,'При миграции изменилось число существующих записей'
print('Существующие книги, пользователи и выдачи сохранены:',tuple(after))
engine.dispose()
