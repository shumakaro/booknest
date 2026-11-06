"""Проверяет цикл миграций, данные имён и параллельные выдачи на собственной scratch-БД."""
import os
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from threading import Barrier
import psycopg
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.config import Settings
from app.models import Book, User
from app.services.catalog import LoanService

settings=Settings()
root=settings.database_url.rsplit('/',1)[0]
url=root+'/booknest_migration_test'
with psycopg.connect(root.replace('+psycopg','')+'/postgres',autocommit=True) as admin:
    if not admin.execute("SELECT 1 FROM pg_database WHERE datname='booknest_migration_test'").fetchone():
        admin.execute('CREATE DATABASE booknest_migration_test')
with psycopg.connect(url.replace('+psycopg',''),autocommit=True) as db:
    assert db.info.dbname=='booknest_migration_test'
    db.execute('DROP SCHEMA public CASCADE')
    db.execute('CREATE SCHEMA public')
os.environ['DATABASE_URL']=url
cfg=Config('alembic.ini')
command.upgrade(cfg,'001_schema')
with psycopg.connect(url.replace('+psycopg',''),autocommit=True) as db:
    db.execute(Path('db/seed.sql').read_text(encoding='utf-8-sig'))
    db.execute("UPDATE profiles SET full_name='Имя  Фамилия ' WHERE user_id=1")
    originals=db.execute('SELECT user_id,full_name FROM profiles ORDER BY user_id').fetchall()
command.upgrade(cfg,'head')
command.downgrade(cfg,'001_schema')
with psycopg.connect(url.replace('+psycopg','')) as db:
    assert db.execute('SELECT user_id,full_name FROM profiles ORDER BY user_id').fetchall()==originals
command.upgrade(cfg,'head')
command.check(cfg)
engine=create_engine(url)
with Session(engine) as db:
    author_id=db.scalar(select(Book.author_id).limit(1))
    book=Book(title='Последний экземпляр',author_id=author_id,year=2020,total_copies=1)
    users=[User(email=f'parallel{i}@example.test',password_hash='disabled-training-account') for i in range(2)]
    db.add_all([book,*users]);db.commit()
    book_id=book.id;user_ids=[user.id for user in users]
barrier=Barrier(2)
def issue(user_id: int) -> int:
    with Session(engine,expire_on_commit=False) as db:
        barrier.wait()
        try:
            LoanService(db).issue(book_id,user_id,date.today()+timedelta(days=14))
            return 201
        except HTTPException as error:
            return error.status_code
with ThreadPoolExecutor(max_workers=2) as pool:
    codes=list(pool.map(issue,user_ids))
assert sorted(codes)==[201,409],codes
Path('docs/lab8/migrations-results.txt').write_text('upgrade 001 -> seed -> upgrade head -> downgrade 001 -> upgrade head: OK\nFull names including repeated and trailing spaces preserved: OK\nAlembic check: no new upgrade operations\nConcurrent last-copy issue: '+str(codes)+'\n',encoding='utf-8')
print('Migration roundtrip, name preservation, schema match, concurrent issue: OK',codes)
engine.dispose()
