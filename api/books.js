/* ==========================================================================
   api/books.js — конкретные запросы к Open Library.

   Этот модуль работает поверх api/client.js.

   Здесь:
   1. НЕТ прямого fetch — все запросы идут через request().
   2. Хранятся конкретные адреса Open Library.
   3. Формируются параметры поиска.
   4. Результаты поиска кэшируются на 60 секунд.

   Open Library API:
     /search.json?q=...     — поиск книг
     /works/{OLID}.json     — детали книги
     /authors/{OLID}.json   — данные автора
   ========================================================================== */

import { request } from "./client.js";

/* ------------------------------------------------------------------
   Кэш результатов поиска.

   Map хранит данные по принципу:

   ключ:
     поисковый запрос + номер страницы

   значение:
     {
       data: ответ API,
       time: время сохранения
     }

   Кэш действует 60 секунд.
   ------------------------------------------------------------------ */

const searchCache = new Map();

const CACHE_TIME = 60 * 1000;

/* ------------------------------------------------------------------
   makeCacheKey — создаёт ключ для Map.

   Например:
     query = "harry potter"
     page = 2

   получится:
     "harry potter::2"

   Таким образом разные страницы одного поиска
   хранятся отдельно.
   ------------------------------------------------------------------ */
function makeCacheKey(query, page) {
  return `${query.trim().toLowerCase()}::${page}`;
}

/* ------------------------------------------------------------------
   getCachedSearch — пытается получить результат из кэша.

   Если:
     - записи нет;
     - прошло больше 60 секунд;

   возвращаем null.

   Если запись ещё свежая — возвращаем сохранённые данные.
   ------------------------------------------------------------------ */
function getCachedSearch(key) {
  const cached = searchCache.get(key);

  if (!cached) {
    return null;
  }

  const age = Date.now() - cached.time;

  // Если прошло больше 60 секунд,
  // удаляем устаревшую запись.
  if (age > CACHE_TIME) {
    searchCache.delete(key);
    return null;
  }

  return cached.data;
}

/* ------------------------------------------------------------------
   saveSearchToCache — сохраняет ответ API в Map.
   ------------------------------------------------------------------ */
function saveSearchToCache(key, data) {
  searchCache.set(key, {
    data,
    time: Date.now(),
  });
}

/* ------------------------------------------------------------------
   searchBooks — поиск книг.

   Принимает:
     query  — текст запроса;
     signal — AbortSignal;
     page   — номер страницы.

   Сначала функция проверяет Map.

   Если свежие данные уже есть — новый сетевой запрос не выполняется.

   Если данных нет или прошло больше 60 секунд —
   выполняется запрос к Open Library и результат сохраняется в Map.
   ------------------------------------------------------------------ */
export async function searchBooks(query, signal, page = 1) {
  // Создаём уникальный ключ поиска.
  const cacheKey = makeCacheKey(query, page);

  // Проверяем, есть ли свежий результат.
  const cachedData = getCachedSearch(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  // Если кэша нет — обращаемся к API.
  const data = await request("/search.json", {
    params: {
      q: query,

      // По заданию на одной странице показываем 20 книг.
      limit: 20,

      // Open Library использует страницы начиная с 1.
      page,

      // Запрашиваем только те поля,
      // которые реально используются приложением.
      fields:
        "key,title,author_name,first_publish_year,cover_i,edition_count,language",
    },

    signal,
  });

  // Сохраняем успешный ответ в кэш.
  saveSearchToCache(cacheKey, data);

  return data;
}

/* ------------------------------------------------------------------
   getBookById — получить подробную информацию о книге.

   olid:
     идентификатор работы Open Library,
     например OL27448W.

   При 404 client.js создаст ApiError со status = 404.
   ------------------------------------------------------------------ */
export async function getBookById(olid, signal) {
  return request(`/works/${olid}.json`, {
    signal,
  });
}

/* ------------------------------------------------------------------
   getAuthor — получить информацию об авторе.

   Например:
     OL26320A

   Возвращает данные автора, в том числе его имя.
   ------------------------------------------------------------------ */
export async function getAuthor(olid, signal) {
  return request(`/authors/${olid}.json`, {
    signal,
  });
}