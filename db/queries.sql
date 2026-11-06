-- 1 Главный экран одним обращением. Два подзапроса исключают умножение выдач на жанры.
SELECT b.id,b.title,a.name AS author,
 (SELECT string_agg(g.name, ', ' ORDER BY g.name) FROM genres g JOIN book_genres bg ON bg.genre_id=g.id WHERE bg.book_id=b.id) AS genres,
 b.total_copies-(SELECT count(*) FROM loans l WHERE l.book_id=b.id AND l.returned_at IS NULL) AS available
FROM books b JOIN authors a ON a.id=b.author_id ORDER BY b.title,b.id LIMIT 20;
-- 2 Просроченные выдачи, соединение трёх таблиц.
SELECT l.id,b.title,u.email,l.due_date FROM loans l JOIN books b ON b.id=l.book_id JOIN users u ON u.id=l.user_id WHERE l.returned_at IS NULL AND l.due_date<current_date;
-- 3 Топ авторов по числу выдач.
SELECT a.name,count(l.id) AS issues FROM authors a JOIN books b ON b.author_id=a.id LEFT JOIN loans l ON l.book_id=b.id GROUP BY a.id ORDER BY issues DESC,a.id LIMIT 5;
-- 4 Читатели без выдач.
SELECT u.email FROM users u LEFT JOIN loans l ON l.user_id=u.id WHERE l.id IS NULL;
-- 5 Статистика жанров.
SELECT g.name,count(bg.book_id) FROM genres g LEFT JOIN book_genres bg ON bg.genre_id=g.id GROUP BY g.id ORDER BY g.id;
-- 6 Авторы, у которых больше пяти книг: HAVING.
SELECT a.name,count(b.id) FROM authors a JOIN books b ON b.author_id=a.id GROUP BY a.id HAVING count(b.id)>5;
-- 7 Вторая страница со стабильным порядком.
SELECT id,title,year FROM books ORDER BY year DESC,id LIMIT 10 OFFSET 10;
-- 8 Вычисляемое число дней просрочки.
SELECT id,current_date-due_date AS days_overdue FROM overdue_loans;
-- 9 Книги, которые никогда не выдавались.
SELECT b.id,b.title FROM books b LEFT JOIN loans l ON l.book_id=b.id WHERE l.id IS NULL;
-- 10 Средний год издания по автору.
SELECT author_id,round(avg(year),1) AS average_year FROM books GROUP BY author_id;
-- 11 Каталог с общим числом без дополнительного запроса.
SELECT id,title,count(*) OVER() AS total FROM books ORDER BY title,id LIMIT 10;
-- 12 Состояние экземпляров.
SELECT b.id,b.total_copies,count(l.id) FILTER(WHERE l.returned_at IS NULL) AS active FROM books b LEFT JOIN loans l ON l.book_id=b.id GROUP BY b.id ORDER BY b.id;
