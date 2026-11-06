-- Детерминированные демонстрационные данные. Запускать на новой учебной базе.
INSERT INTO authors(name,birth_year) SELECT 'Автор '||n, 1900+n FROM generate_series(1,5) n;
INSERT INTO genres(code,name) VALUES ('scifi','Фантастика'),('history','История'),('poetry','Поэзия'),('cs','Информатика'),('fiction','Проза');
INSERT INTO books(title,author_id,year,total_copies,description)
 SELECT 'Книга '||lpad(n::text,2,'0'), (n-1)%5+1, 1990+n, 3, 'Учебная запись '||n FROM generate_series(1,30) n;
INSERT INTO book_genres SELECT id,(id-1)%5+1 FROM books;
-- Эти записи предназначены для SQL-упражнений; вход с ними отключён.
INSERT INTO users(email,password_hash,is_active)
 SELECT 'reader'||n||'@example.test','disabled-training-account',false FROM generate_series(1,10) n;
INSERT INTO profiles(user_id,full_name,faculty) SELECT id,'Читатель '||id,'Учебный факультет' FROM users;
INSERT INTO loans(book_id,user_id,issued_at,due_date,returned_at)
 SELECT n,(n-1)%8+1,current_date-30,current_date-10,
 CASE WHEN n%2=0 THEN current_date-15 ELSE NULL END FROM generate_series(1,20) n;
