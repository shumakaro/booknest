# Сравнение исходного DDL и схем Alembic

Проверка 14 ноября 2026 выполнена на двух новых локальных PostgreSQL 17 БД. Адреса Neon и рабочие строки не использовались. Базы не удалялись. Сравнение применяет последовательность ревизий, а не создает текущую схему через create_all.

## Начальная ревизия

db/schema.sql и реально примененная 001_schema совпали по всем следующим свойствам. Проверены 7 базовых таблиц, отдельно представление overdue_loans. Столбцы представления включены в полный машинный протокол; оно не посчитано восьмой таблицей.

| Таблица | Столбец | Тип | NULL | По умолчанию | Identity |
| --- | --- | --- | --- | --- | --- |
| authors | id | integer (int4) | NO | нет | YES |
| authors | name | character varying (varchar) | NO | нет | NO |
| authors | birth_year | integer (int4) | YES | нет | NO |
| book_genres | book_id | integer (int4) | NO | нет | NO |
| book_genres | genre_id | integer (int4) | NO | нет | NO |
| books | id | integer (int4) | NO | нет | YES |
| books | title | character varying (varchar) | NO | нет | NO |
| books | author_id | integer (int4) | NO | нет | NO |
| books | year | integer (int4) | NO | нет | NO |
| books | isbn | character varying (varchar) | YES | нет | NO |
| books | total_copies | integer (int4) | NO | 1 | NO |
| books | description | text (text) | NO | ''::text | NO |
| books | created_at | timestamp with time zone (timestamptz) | NO | now() | NO |
| genres | id | integer (int4) | NO | нет | YES |
| genres | code | character varying (varchar) | NO | нет | NO |
| genres | name | character varying (varchar) | NO | нет | NO |
| loans | id | integer (int4) | NO | нет | YES |
| loans | book_id | integer (int4) | NO | нет | NO |
| loans | user_id | integer (int4) | NO | нет | NO |
| loans | issued_at | date (date) | NO | CURRENT_DATE | NO |
| loans | due_date | date (date) | NO | нет | NO |
| loans | returned_at | date (date) | YES | нет | NO |
| overdue_loans | id | integer (int4) | YES | нет | NO |
| overdue_loans | book_id | integer (int4) | YES | нет | NO |
| overdue_loans | user_id | integer (int4) | YES | нет | NO |
| overdue_loans | issued_at | date (date) | YES | нет | NO |
| overdue_loans | due_date | date (date) | YES | нет | NO |
| overdue_loans | returned_at | date (date) | YES | нет | NO |
| profiles | user_id | integer (int4) | NO | нет | NO |
| profiles | full_name | text (text) | NO | нет | NO |
| profiles | faculty | text (text) | YES | нет | NO |
| users | id | integer (int4) | NO | нет | YES |
| users | email | character varying (varchar) | NO | нет | NO |
| users | password_hash | character varying (varchar) | NO | нет | NO |
| users | role | character varying (varchar) | NO | 'member'::character varying | NO |
| users | is_active | boolean (bool) | NO | true | NO |
| users | created_at | timestamp with time zone (timestamptz) | NO | now() | NO |

## Ограничения исходной схемы

Сравнены определения, а не только количество — 28 ограничений.

- authors: c, CHECK (((birth_year >= 1000) AND (birth_year <= 2100)))
- authors: c, CHECK ((length(TRIM(BOTH FROM name)) > 0))
- authors: p, PRIMARY KEY (id)
- authors: u, UNIQUE (name)
- book_genres: f, FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
- book_genres: f, FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
- book_genres: p, PRIMARY KEY (book_id, genre_id)
- books: c, CHECK (((isbn IS NULL) OR ((isbn)::text ~ '^[0-9]{13}$'::text)))
- books: c, CHECK (((year >= 1450) AND (year <= 2100)))
- books: c, CHECK ((length(TRIM(BOTH FROM title)) > 0))
- books: c, CHECK ((total_copies >= 0))
- books: f, FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE RESTRICT
- books: p, PRIMARY KEY (id)
- books: u, UNIQUE (isbn)
- genres: c, CHECK (((code)::text = ANY ((ARRAY['scifi'::character varying, 'history'::character varying, 'poetry'::character varying, 'cs'::character varying, 'fiction'::character varying])::text[])))
- genres: p, PRIMARY KEY (id)
- genres: u, UNIQUE (code)
- loans: c, CHECK (((returned_at IS NULL) OR (returned_at >= issued_at)))
- loans: c, CHECK ((due_date > issued_at))
- loans: f, FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE RESTRICT
- loans: f, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
- loans: p, PRIMARY KEY (id)
- profiles: f, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- profiles: p, PRIMARY KEY (user_id)
- users: c, CHECK (((role)::text = ANY ((ARRAY['member'::character varying, 'librarian'::character varying])::text[])))
- users: c, CHECK ((POSITION(('@'::text) IN (email)) > 1))
- users: p, PRIMARY KEY (id)
- users: u, UNIQUE (email)

## Текущие модели

Исходный DDL относится к ревизии 001, а текущая ORM — к 006. После upgrade head команда alembic check не обнаружила новых операций: переименования, поля авторизации, формы, желаемого и внешних книг учитываются соответствующими ревизиями. Сравнивать 001 непосредственно с 006 без этих преобразований и требовать полного равенства было бы ошибкой.

## Обратимость

Выполнено 001 → seed → head → 001 → head. Имена с повторными и конечными пробелами совпали после отката; число книг осталось 30. История всех шести ревизий и полные характеристики обоих состояний сохранены в lecture-10-11-db-validation.json. Это новая локальная проверка; прежний конкурентный результат 201/409 и N+1 26→3 сохранены отдельно как исторические.
