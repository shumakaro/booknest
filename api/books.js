/* ==========================================================================
   api/books.js — конкретные запросы к Open Library.

   Этот модуль — тонкая обёртка над api/client.js. Здесь НЕТ fetch
   (он только в client.js), НЕТ обработки ошибок (она тоже в client.js).
   Задача файла — знать, какие эндпоинты у Open Library и какие
   параметры им нужны.

   Всё, что делают функции здесь: собирают path и params,
   вызывают request() и возвращают результат.

   Open Library API:
     /search.json?q=...     — поиск книг
     /works/{OLID}.json     — детали одной работы
     /authors/{OLID}.json   — детали автора
   ========================================================================== */

import { request } from "./client.js";

/* ------------------------------------------------------------------
   searchBooks — поиск книг по строке запроса.

   Принимает:
     query  — текст поиска (например, "harry potter");
     signal — AbortSignal для отмены запроса.

   Возвращает объект вида { docs: [...], numFound: N }.

   Параметры запроса к Open Library:
     q      — что искать;
     limit  — сколько результатов вернуть (по заданию 20);
     page   — номер страницы (Open Library использует 1-based нумерацию);
     fields — какие поля включить в ответ. Мы запрашиваем только нужные:
              key (OLID для ссылки на детали), title, author_name,
              first_publish_year, cover_i (id обложки), edition_count,
              language. Без fields приходит слишком много лишнего.
   ------------------------------------------------------------------ */
export async function searchBooks(query, signal, page = 1) {
  return request("/search.json", {
    params: {
      q: query,
      limit: 20,
      page: page,
      // Перечисляем только поля, которые реально используем. Это уменьшает
      // размер ответа и ускоряет загрузку.
      fields: "key,title,author_name,first_publish_year,cover_i,edition_count,language",
    },
    signal,
  });
}

/* ------------------------------------------------------------------
   getBookById — получить детали одной книги (работа в терминах Open Library).

   Принимает:
     olid   — идентификатор работы, например "OL27448W";
     signal — AbortSignal для отмены.

   Возвращает объект с полями title, description, covers, subjects, ...

   ВАЖНО: если книга не найдена, Open Library вернёт 404. Наш client.js
   увидит это через !response.ok и бросит ApiError со status=404.
   Страница деталей в UI поймает эту ошибку и покажет «Книга не найдена».
   ------------------------------------------------------------------ */
export async function getBookById(olid, signal) {
  return request(`/works/${olid}.json`, { signal });
}

/* ------------------------------------------------------------------
   getAuthor — получить данные автора по его OLID.

   Принимает:
     olid   — идентификатор автора, например "OL26320A";
     signal — AbortSignal.

   Возвращает объект с полем name — имя автора.
   ------------------------------------------------------------------ */
export async function getAuthor(olid, signal) {
  return request(`/authors/${olid}.json`, { signal });
}