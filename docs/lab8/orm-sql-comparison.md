# SQL и ORM

Рукописный запрос: SELECT id,title FROM books WHERE author_id=1 ORDER BY year,id LIMIT 20.

SQLAlchemy select() после компиляции:

```sql
SELECT books.id, books.title 
FROM books 
WHERE books.author_id = 1 ORDER BY books.year, books.id 
 LIMIT 20
```

Обе формы задают одинаковые фильтр, порядок и ограничение. ORM квалифицирует столбцы именем таблицы и форматирует запрос; при обычном выполнении значения передаются параметрами, а не интерполяцией. literal_binds здесь использован только для читаемого учебного вывода с постоянным числом 1.
