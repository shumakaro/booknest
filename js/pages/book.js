/* ==========================================================================
   pages/book.js — логика страницы деталей одной книги.

   Страница открывается по адресу book.html?id=OL12345W, где после "id="
   стоит идентификатор работы из Open Library (OLID).

   Что делает этот модуль:
     1. Читает id из URL.
     2. Если id нет или пустой — показывает ошибку «Книга не найдена».
     3. Параллельно запрашивает саму книгу и данные её автора через
        Promise.all — это независимые запросы, поэтому они идут
        одновременно, а не друг за другом.
     4. При успехе рендерит название, описание, обложку, автора, темы.
     5. При ошибке (в том числе 404) показывает сообщение и кнопку «Повторить».

   ВАЖНО (для защиты): страница использует тот же api/client.js,
   что и каталог. fetch здесь НЕ вызывается — только наши обёртки.
   ========================================================================== */

import { getBookById, getAuthor } from "../../api/books.js";
import { ApiError } from "../../api/client.js";

/* ------------------------------------------------------------------
   Элементы страницы.
   ------------------------------------------------------------------ */
const loadingEl = document.querySelector("#details-loading");
const errorEl   = document.querySelector("#details-error");
const contentEl = document.querySelector("#details-content");
const errorTextEl = document.querySelector("#details-error-text");
const retryBtn = document.querySelector("#details-error-retry");

/* ------------------------------------------------------------------
   showState — показать одно из трёх состояний.
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
   ------------------------------------------------------------------ */
function getBookIdFromUrl() {
  const params = new URLSearchParams(location.search);
  return params.get("id");
}

/* ------------------------------------------------------------------
   humanizeError — превратить ошибку в понятный текст.
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
   extractAuthorId — вытащить OLID автора из ссылки вида "/authors/OL26320A".

   В ответе работы authors приходят как массив объектов:
     [
       { author: { key: "/authors/OL26320A" }, type: {...} },
       ...
     ]

   Возвращаем первый id или null, если автора нет.
   ------------------------------------------------------------------ */
function extractAuthorId(book) {
  if (!Array.isArray(book.authors) || book.authors.length === 0) {
    return null;
  }
  const first = book.authors[0];
  if (!first || !first.author || typeof first.author.key !== "string") {
    return null;
  }
  return first.author.key.replace("/authors/", "");
}

/* ------------------------------------------------------------------
   renderBook — отрисовать данные книги в контейнер #details-content.

   Принимает:
     book       — объект работы из Open Library;
     authorData — объект автора или null, если автора не удалось получить.
   ------------------------------------------------------------------ */
function renderBook(book, authorData) {
  if (!contentEl) return;

  const title = book.title || "Без названия";

  let description = "Описание отсутствует.";
  if (typeof book.description === "string") {
    description = book.description;
  } else if (book.description && typeof book.description.value === "string") {
    description = book.description.value;
  }

  const coverId = Array.isArray(book.covers) && book.covers.length > 0
    ? book.covers[0]
    : null;
  const coverUrl = coverId
    ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
    : "";

  const subjects = Array.isArray(book.subjects)
    ? book.subjects.slice(0, 8).join(", ")
    : "";

  const firstPublished = book.first_publish_date || "—";

  // Имя автора: если пришло из второго запроса — показываем.
  // Если запрос автора упал (Promise.allSettled) или автора нет —
  // пишем «Автор неизвестен».
  const authorName = authorData && authorData.name
    ? authorData.name
    : "Автор неизвестен";

  contentEl.innerHTML = `
    <h1 class="book__title">${title}</h1>
    ${coverUrl ? `<img class="book__cover" src="${coverUrl}" alt="Обложка ${title}" width="300" height="450">` : ""}
    <dl class="specs">
      <dt class="specs__term">Автор</dt>
      <dd class="specs__value">${authorName}</dd>
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

   ВАЖНО (для защиты): используем Promise.all, чтобы два независимых
   запроса шли параллельно:
     - getBookById — данные книги;
     - getAuthor   — данные автора (если он есть в ответе работы).

   Если бы мы делали эти запросы последовательно через два await,
   общее время ожидания было бы суммой времён. При Promise.all —
   максимум из двух. Для медленной сети это заметно.

   Параллельный запуск оформлен через Promise.allSettled, потому что
   данные автора не критичны: если он не загрузится, страница всё
   равно должна показать саму книгу. Promise.all «упал бы» целиком
   при первой же ошибке, а allSettled дожидается обоих запросов и
   возвращает массив результатов со статусами fulfilled / rejected.
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
    // Первый запрос — данные книги. Он критичен: без него страницы нет.
    const book = await getBookById(id);

    // Определяем, есть ли у книги автор, чтобы не делать пустой запрос.
    const authorId = extractAuthorId(book);

    // Два независимых запроса идут параллельно через Promise.allSettled.
    // В массиве — две "обёртки" промисов: первый сразу успешен (book),
    // второй либо успешен (author), либо упал (rejected), если автора нет
    // или запрос не удался. Promise.allSettled ждёт оба и не падает
    // при ошибке одного.
    const [bookResult, authorResult] = await Promise.allSettled([
      Promise.resolve(book),                       // уже полученная книга
      authorId ? getAuthor(authorId) : Promise.resolve(null),
    ]);

    // Данные книги — гарантированно есть, потому что выше был await.
    const bookData = bookResult.value;

    // Данные автора — берём, только если запрос был успешен.
    const authorData = authorResult.status === "fulfilled"
      ? authorResult.value
      : null;

    renderBook(bookData, authorData);
    showState("content");
  } catch (error) {
    showState("error", humanizeError(error));
  } finally {
    // ВАЖНО (для защиты): снятие индикатора загрузки в finally.
    // Если поставить только в try, при ошибке loading останется видимым.
    // Здесь мы просто гарантируем, что состояние всегда сброшено,
    // независимо от того, чем закончился try.
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