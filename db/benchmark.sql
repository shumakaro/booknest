-- Отдельная нагрузочная таблица: демонстрационные данные приложения не меняются.
CREATE TABLE benchmark_books AS SELECT n AS id, n%5000 AS author_id, 1900+n%125 AS year,'Книга '||n AS title FROM generate_series(1,500000) n;
ANALYZE benchmark_books;
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM benchmark_books WHERE author_id=42 ORDER BY year,id LIMIT 20;
CREATE INDEX benchmark_author_year_idx ON benchmark_books(author_id,year,id);
ANALYZE benchmark_books;
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM benchmark_books WHERE author_id=42 ORDER BY year,id LIMIT 20;
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM benchmark_books WHERE to_tsvector('simple',title) @@ plainto_tsquery('simple','499999');
CREATE INDEX benchmark_fts_idx ON benchmark_books USING gin(to_tsvector('simple',title));
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM benchmark_books WHERE to_tsvector('simple',title) @@ plainto_tsquery('simple','499999');
