"""Измеряет полный экран каталога только в новом изолированном namespace."""
from pathlib import Path
import json
import psycopg
from dotenv import dotenv_values

url=dotenv_values('.env')['DATABASE_URL'].replace('postgresql+psycopg://','postgresql://').rsplit('/',1)[0]+'/booknest_sql'
namespace='screen_benchmark_20261106'
with psycopg.connect(url) as db:
    if db.execute('SELECT 1 FROM pg_namespace WHERE nspname=%s',(namespace,)).fetchone():
        raise SystemExit('Namespace уже существует; повторное заполнение запрещено')
    original=db.execute('SELECT (SELECT count(*) FROM public.books),(SELECT count(*) FROM public.loans)').fetchone()
    db.execute(psycopg.sql.SQL('CREATE SCHEMA {}').format(psycopg.sql.Identifier(namespace)))
    db.execute(psycopg.sql.SQL('SET search_path TO {}').format(psycopg.sql.Identifier(namespace)))
    db.execute(Path('db/schema.sql').read_text(encoding='utf-8-sig'))
    db.execute("INSERT INTO authors(name) SELECT 'Автор '||n FROM generate_series(1,5000)n")
    db.execute("INSERT INTO genres(code,name) VALUES('cs','Информатика'),('fiction','Проза')")
    db.execute("INSERT INTO users(email,password_hash) VALUES('benchmark@example.com','not-a-login-hash')")
    db.execute("INSERT INTO books(title,author_id,year,total_copies) SELECT 'Книга '||lpad(n::text,6,'0'),1+n%5000,1900+n%125,2 FROM generate_series(1,500000)n")
    db.execute('INSERT INTO book_genres SELECT id,1+id%2 FROM books')
    db.execute("INSERT INTO loans(book_id,user_id,due_date) SELECT id,1,current_date+14 FROM books WHERE id%5=0")
    db.execute('ANALYZE')
    # Главный экран получает автора, жанры и число активных выдач каждого результата.
    query="""SELECT b.id,b.title,a.name AS author,b.total_copies,
    (SELECT string_agg(g.name,', ' ORDER BY g.name) FROM book_genres bg JOIN genres g ON g.id=bg.genre_id WHERE bg.book_id=b.id) AS genres,
    b.total_copies-(SELECT count(*) FROM loans l WHERE l.book_id=b.id AND l.returned_at IS NULL) AS available
    FROM books b JOIN authors a ON a.id=b.author_id ORDER BY b.title,b.id LIMIT 20"""
    before=db.execute('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) '+query).fetchone()[0]
    rows_before=db.execute(query).fetchall()
    db.execute('CREATE INDEX books_title_id_idx ON books(title,id)')
    db.execute('ANALYZE books')
    after=db.execute('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) '+query).fetchone()[0]
    assert rows_before==db.execute(query).fetchall()
    assert original==db.execute('SELECT (SELECT count(*) FROM public.books),(SELECT count(*) FROM public.loans)').fetchone()
    evidence={'namespace':namespace,'books':500000,'loans':100000,'query':query,'before':before,'after':after,'same_20_rows':True,'original_public_counts_unchanged':list(original)}
    Path('docs/lab12/catalog-benchmark.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Full catalogue query ms:',before[0]['Execution Time'],'->',after[0]['Execution Time'])
    # Namespace оставляется для изучения планов. Очистка не выполняется.
