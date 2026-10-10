/* ==========================================================================
   pages/book.js — логика страницы деталей одной книги.

   Страница открывается по адресу book.html?id=OL12345W, где после "id="
   стоит идентификатор работы из Open Library (OLID).

   Что делает этот модуль:
     1. Читает id из URL.
     2. Если id нет или пустой — показывает ошибку «Книга не найдена».
     3. Запрашивает данные через getBookById.
     4. При успехе рендерит название, описание, обложку, темы.
     5. При ошибке (в том числе 404) показывает сообщение и кнопку «Повторить».

   ВАЖНО (для защиты): страница использует тот же api/client.js,
   что и каталог. fetch здесь НЕ вызывается — только наши обёртки.
   ========================================================================== */

import { getBookById } from "../../api/books.js";
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
   showState — показать одно из трёх состояний: loading, error, content.
   Остальные скрываются.
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

   Отдельно обрабатываем 404 — это требование задания: страница
   должна показать «Книга не найдена», а не общее «ошибка».
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

   Из Open Library приходит объект:
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
function renderBook(book) {
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

  contentEl.innerHTML = `
    <h1 class="book__title">${title}</h1>
    ${coverUrl ? `<img class="book__cover" src="${coverUrl}" alt="Обложка ${title}" width="300" height="450">` : ""}
    <dl class="specs">
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
     3. Запросить getBookById.
     4. При успехе — content.
     5. При ошибке — error с текстом.
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
    const book = await getBookById(id);
    renderBook(book);
    showState("content");
  } catch (error) {
    showState("error", humanizeError(error));
  }
}

/* ------------------------------------------------------------------
   Обработчик кнопки «Повторить».
   ------------------------------------------------------------------ */
if (retryBtn) {
  retryBtn.addEventListener("click", loadBook);
}

/* ------------------------------------------------------------------
   Старт.
   ------------------------------------------------------------------ */
loadBook();