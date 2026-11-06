"""Сохраняет компиляцию ORM-запроса без выполнения изменяющих операций."""
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.dialects import postgresql
from app.models import Book
statement = select(Book.id, Book.title).where(Book.author_id == 1).order_by(Book.year, Book.id).limit(20)
sql = str(statement.compile(dialect=postgresql.dialect(), compile_kwargs={'literal_binds': True}))
Path('docs/lab8/orm-sql-comparison.md').write_text('# SQL и ORM\n\nРукописный запрос: SELECT id,title FROM books WHERE author_id=1 ORDER BY year,id LIMIT 20.\n\nSQLAlchemy select() после компиляции:\n\n```sql\n'+sql+'\n```\n\nОбе формы задают одинаковые фильтр, порядок и ограничение. ORM квалифицирует столбцы именем таблицы и форматирует запрос; при обычном выполнении значения передаются параметрами, а не интерполяцией. literal_binds здесь использован только для читаемого учебного вывода с постоянным числом 1.\n',encoding='utf-8')
