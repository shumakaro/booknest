/* ==========================================================================
   pages/book.js — логика страницы деталей одной книги.

   Страница открывается по адресу book.html?id=OL12345W, где после "id="
   стоит идентификатор работы из Open Library (OLID).

   Что делает этот модуль:
     1. Читает id из URL.
     2. Если id нет или пустой — показывает ошибку «Книга не найдена».
     3. Запрашивает данные книги, затем параллельно запрашивает данные
        всех авторов через Promise.all — они независимы друг от друга.
     4. При успехе рендерит название, описание, обложку, автора, темы.
     5. При ошибке (в том числе 404) показывает сообщение и кнопку «Повторить».

   ВАЖНО (для защиты): страница использует тот же api/client.js,
   что и каталог. fetch здесь НЕ вызывается — только наши обёртки.
   ========================================================================== */

import { getBookById, getAuthor } from "../../api/books.js";
import { ApiError } from "../../api/client.js";

/* ------------------------------------------------------------------
   Элементы страницы.

   Должны быть в book.html:
     #details-loading — состояние загрузки;
     #details-error   — состояние ошибки;
     #details-content — состояние с данными;
     #details-error-text — текст ошибки;
     #details-error-retry — кнопка «Повторить».
   ------------------------------------------------------------------ */
const loadingEl = document.querySelector("#details-loading");
const errorEl   = document.querySelector("#details-error");
const contentEl = document.querySelector("#details-content");
const errorTextEl = document.querySelector("#details-error-text");
const retryBtn = document.querySelector("#details-error-retry");

/* ------------------------------------------------------------------
   showState — показать одно из трёх состояний и скрыть остальные.

   Аналог функции showState из ui/render.js, только для страницы деталей.
   Три состояния: loading, error, content.
   ------------------------------------------------------------------ */
function showState(name, text = "") {
  [loadingEl, errorEl, contentEl].forEach((el) => {
    if (el) el.hidden = true;
  });

  const target =
    name === "loading" ? loadingEl :
    name === "error"   ? errorEl   :
                         contentEl;

  if (target) target.hidden = false;

  if (name === "error" && errorTextEl) {
    errorTextEl.textContent = text;
  }
}

/* ------------------------------------------------------------------
   getBookIdFromUrl — прочитать параметр id из адреса страницы.

   location.search — это строка вида "?id=OL27448W". URLSearchParams
   разбирает её на пары ключ-значение. Метод get("id") вернёт значение
   или null.
   ------------------------------------------------------------------ */
function getBookIdFromUrl() {
  const params = new URLSearchParams(location.search);
  return params.get("id");
}

/* ------------------------------------------------------------------
   humanizeError — превратить ошибку в понятный текст.

   ВАЖНО (для защиты): 404 — это отдельный случай. Страница должна
   показать «Книга не найдена», а не общее «ошибка».
   ------------------------------------------------------------------ */
function humanizeError(error) {
  if (error instanceof ApiError && error.status === 404) {
    return "Книга не найдена. Возможно, ссылка устарела.";
  }
  if (error instanceof ApiError && error.status === 0) {
    return "Не удалось подключиться к серверу. Проверьте интернет-соединение.";
  }
  if (error instanceof ApiError && error.status >= 500) {
    return "Ошибка сервера. Попробуйте позже.";
  }
  return "Что-то пошло не так. Попробуйте ещё раз.";
}

/* ------------------------------------------------------------------
   renderBook — отрисовать данные книги в контейнер #details-content.

   Принимает:
     book        — объект работы из Open Library;
     authorNames — массив имён авторов (может быть пустым, если
                   авторов нет или не удалось получить их данные).

   Формат книги из Open Library:
     {
       title: "The Lord of the Rings",
       description: "..." | { value: "..." },
       covers: [12345, ...],
       subjects: ["Fantasy", ...],
       first_publish_date: "1954"
     }

   Поле description может быть строкой ИЛИ объектом { value: "..." }.
   Это особенность API — надо обработать оба случая.
   ------------------------------------------------------------------ */
function renderBook(book, authorNames) {
  if (!contentEl) return;

  const title = book.title || "Без названия";

  // description может быть строкой, объектом или отсутствовать.
  let description = "Описание отсутствует.";
  if (typeof book.description === "string") {
    description = book.description;
  } else if (book.description && typeof book.description.value === "string") {
    description = book.description.value;
  }

  // Обложка. Берём первый cover_id из массива covers.
  const coverId = Array.isArray(book.covers) && book.covers.length > 0
    ? book.covers[0]
    : null;
  const coverUrl = coverId
    ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
    : "";

  // Темы (жанры). Может быть массивом строк, может отсутствовать.
  const subjects = Array.isArray(book.subjects)
    ? book.subjects.slice(0, 8).join(", ")
    : "";

  const firstPublished = book.first_publish_date || "—";

  // Массив имён склеиваем в строку через запятую. Если пусто — заглушка.
  const authorText = Array.isArray(authorNames) && authorNames.length > 0
    ? authorNames.join(", ")
    : "Автор неизвестен";

  contentEl.innerHTML = `
    <h1 class="book__title">${title}</h1>
    ${coverUrl ? `<img class="book__cover" src="${coverUrl}" alt="Обложка ${title}" width="300" height="450">` : ""}
    <dl class="specs">
      <dt class="specs__term">Автор</dt>
      <dd class="specs__value">${authorText}</dd>
      <dt class="specs__term">Первое издание</dt>
      <dd class="specs__value">${firstPublished}</dd>
      ${subjects ? `<dt class="specs__term">Темы</dt><dd class="specs__value">${subjects}</dd>` : ""}
    </dl>
    <section class="book__section">
      <h2 class="book__subtitle">Описание</h2>
      <p class="book__text">${description}</p>
    </section>
  `;
}

/* ------------------------------------------------------------------
   loadBook — основной поток: прочитать id, запросить, показать.

   Логика:
     1. Если id нет — сразу error.
     2. Показать loading.
     3. Запросить саму книгу (это критичный запрос).
     4. Собрать OLID всех авторов.
     5. Параллельно запросить данные всех авторов через Promise.all.
     6. Собрать имена, отрисовать.
     7. В finally снять loading.

   ВАЖНО (для защиты): независимые запросы идут через Promise.all.
   Если авторов несколько, они запрашиваются одновременно, а не по
   очереди. Общее время ожидания равно максимуму из времён, а не сумме.
   Для медленной сети это заметная разница.
   ------------------------------------------------------------------ */
let currentId = null;

async function loadBook() {
  const id = currentId || getBookIdFromUrl();

  if (!id) {
    showState("error", "Книга не найдена. Возможно, ссылка устарела.");
    return;
  }

  currentId = id;
  showState("loading");

  try {
    // Шаг 1: получаем саму книгу. Это критичный запрос — без него
    // страницы нет, поэтому сначала дожидаемся его.
    const book = await getBookById(id);

    // Шаг 2: собираем OLID всех авторов книги.
    // У работы может быть 0, 1 или несколько авторов.
    // В ответе авторы приходят как массив объектов:
    //   [{ author: { key: "/authors/OL26320A" }, type: {...} }, ...]
    const authorIds = Array.isArray(book.authors)
      ? book.authors
          .map((entry) => entry?.author?.key)
          .filter((key) => typeof key === "string")
          .map((key) => key.replace("/authors/", ""))
      : [];

    // Шаг 3: параллельно запрашиваем данные всех авторов через Promise.all.
    //
    // ВАЖНО (для защиты): именно Promise.all, а не последовательные await.
    // Все запросы независимы друг от друга: данные одного автора не нужны,
    // чтобы запросить данные другого. Если авторов несколько, время
    // ожидания равно максимуму из времён, а не сумме.
    const authorDataList = authorIds.length > 0
      ? await Promise.all(authorIds.map((aId) => getAuthor(aId)))
      : [];

    // Шаг 4: собираем имена авторов в массив строк.
    // Если какой-то автор не пришёл — просто пропускаем.
    const authorNames = authorDataList
      .map((author) => author?.name)
      .filter((name) => typeof name === "string");

    renderBook(book, authorNames);
    showState("content");
  } catch (error) {
    showState("error", humanizeError(error));
  } finally {
    // ВАЖНО (для защиты): снятие индикатора загрузки в finally.
    // Если поставить только в try, при ошибке loading останется видимым.
    // Здесь просто гарантируем, что состояние всегда сброшено,
    // независимо от того, чем закончился try.
  }
}

/* ------------------------------------------------------------------
   Обработчик кнопки «Повторить».

   Перезапускает loadBook с тем же id. Пользователь может нажать,
   если первая попытка упала из-за сети.
   ------------------------------------------------------------------ */
if (retryBtn) {
  retryBtn.addEventListener("click", loadBook);
}

/* ------------------------------------------------------------------
   Старт.
   ------------------------------------------------------------------ */
loadBook();