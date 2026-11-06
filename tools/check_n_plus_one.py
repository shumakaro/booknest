"""Сохраняет SQL-логи до и после устранения N+1 на одном наборе данных."""
from pathlib import Path
from sqlalchemy import event, select
from sqlalchemy.orm import selectinload
from app.db import get_session_factory
from app.models import Book

factory=get_session_factory()
engine=factory.kw['bind']
for eager,label in [(False,'before'),(True,'after')]:
    queries=[]
    def collect(connection,cursor,statement,parameters,context,executemany):
        if statement.lstrip().upper().startswith('SELECT'):
            queries.append(statement)
    event.listen(engine,'before_cursor_execute',collect)
    try:
        with factory() as db:
            stmt=select(Book).where(Book.deleted_at.is_(None)).order_by(Book.id).limit(20)
            if eager:
                stmt=stmt.options(selectinload(Book.author),selectinload(Book.genres))
            books=list(db.scalars(stmt))
            for book in books:
                _=book.author.name
                _=[genre.name for genre in book.genres]
        Path(f'docs/lab8/n-plus-one-{label}.log').write_text('\n\n'.join(queries)+f'\n\nSELECT count: {len(queries)}\n',encoding='utf-8')
        print(label,len(queries))
    finally:
        event.remove(engine,'before_cursor_execute',collect)
