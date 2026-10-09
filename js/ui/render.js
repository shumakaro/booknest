/* ==========================================================================
   ui/render.js — отрисовка интерфейса и управление состояниями.

   Этот модуль знает о DOM, но НЕ знает о сети и логике запросов.
   Задача: получить готовые данные и показать их, либо показать,
   что мы в состоянии loading / empty / error.

   ВАЖНО (для защиты): четыре состояния — loading, success, empty, error —
   взаимоисключающие. На экране всегда видно РОВНО ОДНО. Это требование
   задания: пользователь никогда не должен видеть «Загрузка…» и «Ошибка»
   одновременно. Реализуется через единую функцию showState, которая
   сначала скрывает все блоки, потом показывает нужный.
   ========================================================================== */

/* ------------------------------------------------------------------
   Ссылки на блоки состояний в HTML.

   Эти элементы должны быть в index.html. Если какого-то нет —
   функция showState тихо выйдет и приложение не упадёт.
   ------------------------------------------------------------------ */
const stateEls = {
  loading: document.querySelector("#state-loading"),
  error:   document.querySelector("#state-error"),
  empty:   document.querySelector("#state-empty"),
  success: document.querySelector("#state-success"),
};

/* ------------------------------------------------------------------
   Ссылка на контейнер с результатами (список книг).
   ------------------------------------------------------------------ */
const resultsEl = document.querySelector("#book-list");

/* ------------------------------------------------------------------
   Ссылки на элементы пагинации и сообщения об ошибке.
   ------------------------------------------------------------------ */
const errorTextEl   = document.querySelector("#state-error-text");
const prevBtn       = document.querySelector("#pagination-prev");
const nextBtn       = document.querySelector("#pagination-next");
const pageInfoEl    = document.querySelector("#pagination-info");

/* ------------------------------------------------------------------
   showState — показать одно из четырёх состояний и скрыть остальные.

   Принимает:
     name  — "loading" | "success" | "empty" | "error";
     text  — текст для состояния error (или пусто).

   Логика:
     1. Скрываем все блоки состояний через атрибут hidden.
     2. Показываем нужный блок.
     3. Если это error — записываем текст.

   ВАЖНО (для защиты): именно здесь выполняется требование
   «одновременно только одно состояние». Всегда одна точка входа.
   ------------------------------------------------------------------ */
export function showState(name, text = "") {
  // Шаг 1: скрыть все блоки. Object.values получает массив значений
  // объекта stateEls, forEach проходит по нему.
  Object.values(stateEls).forEach((el) => {
    if (el) el.hidden = true;
  });

  // Шаг 2: показать нужный. Если элемента нет — тихо выходим,
  // чтобы приложение не упало в неожиданной ситуации.
  const target = stateEls[name];
  if (!target) return;
  target.hidden = false;

  // Шаг 3: для состояния error подставляем текст ошибки.
  if (name === "error" && errorTextEl) {
    errorTextEl.textContent = text;
  }
}

/* ------------------------------------------------------------------
   renderSearchResults — отрисовать карточки найденных книг.

   Принимает:
     books    — массив из поля docs ответа Open Library;
     wishlist — Set с id книг в списке желаемого (у нас id = OLID).

   Формат книги из Open Library:
     {
       key: "/works/OL27448W",
       title: "The Lord of the Rings",
       author_name: ["Tolkien"],
       first_publish_year: 1954,
       cover_i: 12345,
       edition_count: 42,
       language: ["eng"]
     }

   Обрати внимание: author_name — массив, а не строка. Может быть пустым.
   Это надо учесть при выводе, иначе на экране появится "undefined".
   ------------------------------------------------------------------ */
export function renderSearchResults(books, wishlist) {
  if (!resultsEl) return;

  // Если книг нет — эту ситуацию обрабатывает showState("empty"),
  // поэтому здесь мы её не дублируем.
  if (books.length === 0) {
    resultsEl.innerHTML = "";
    return;
  }

  // Собираем карточки через map. Все данные берём из ответа API,
  // пользовательских данных тут нет, поэтому innerHTML безопасен.
  const html = books
    .map((book) => {
      // Вырезаем OLID из ключа "/works/OL27448W" → "OL27448W".
      // Это нужно для ссылки на страницу деталей и для wishlist.
      const olid = book.key.replace("/works/", "");

      // Автор может быть массивом, может отсутствовать, может быть пустым.
      // Здесь — защита от всех трёх случаев.
      const author = Array.isArray(book.author_name) && book.author_name.length > 0
        ? book.author_name[0]
        : "Автор неизвестен";

      // Год публикации — тоже может быть пустым.
      const year = book.first_publish_year ? book.first_publish_year : "—";

      // Обложка. У Open Library формат URL для обложек такой:
      // https://covers.openlibrary.org/b/id/{id}-M.jpg
      // M — размер Medium. Если cover_i нет, ставим заглушку.
      const coverUrl = book.cover_i
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
        : "";

      // Проверяем, в списке желаемого ли эта книга.
      const inWishlist = wishlist.has(olid);
      const buttonText = inWishlist ? "В списке" : "Хочу прочитать";
      const pressed = inWishlist ? "true" : "false";

      return `
        <li class="book-card" data-olid="${olid}">
          ${coverUrl ? `<img class="book-card__cover" src="${coverUrl}" alt="Обложка ${book.title}" width="120" height="180">` : ""}
          <h3 class="book-card__title">${book.title}</h3>
          <p class="book-card__meta">Автор: ${author}</p>
          <p class="book-card__meta">Год: ${year}</p>
          <p class="book-card__meta">Изданий: ${book.edition_count ?? "—"}</p>
          <a class="book-card__details" href="book.html?id=${olid}">Подробнее</a>
          <button
            type="button"
            class="book-card__wish js-wish"
            data-olid="${olid}"
            aria-pressed="${pressed}"
          >${buttonText}</button>
        </li>
      `;
    })
    .join("");

  resultsEl.innerHTML = html;
}

/* ------------------------------------------------------------------
   renderPagination — обновить состояние кнопок пагинации.

   Принимает:
     currentPage — текущая страница (1-based);
     totalPages  — всего страниц (может быть null, если неизвестно).

   Логика:
     - на первой странице кнопка «Назад» заблокирована;
     - на последней — «Вперёд»;
     - если totalPages неизвестно — блокируем только по границам.
   ------------------------------------------------------------------ */
export function renderPagination(currentPage, totalPages) {
  if (pageInfoEl) {
    pageInfoEl.textContent = `Страница ${currentPage}${totalPages ? ` из ${totalPages}` : ""}`;
  }

  if (prevBtn) {
    // disabled у кнопки — стандартное свойство. Если true, кнопка
    // становится неактивной, пользователь не может кликнуть.
    prevBtn.disabled = currentPage <= 1;
  }

  if (nextBtn) {
    // Если totalPages неизвестно (null) — считаем, что не последняя.
    // Клик сделает запрос, и если книг нет, сервер сам вернёт пусто.
    nextBtn.disabled = totalPages !== null && currentPage >= totalPages;
  }
}

/* ------------------------------------------------------------------
   renderWishlistCount — счётчик в шапке («Мой список: N»).

   Оставили из ЛР №3, функция работает как раньше.
   ------------------------------------------------------------------ */
export function renderWishlistCount(element, count) {
  if (!element) return;
  element.textContent = `Мой список: ${count}`;
}

/* ------------------------------------------------------------------
   pluralize — склонение слова «книга» по числам.

   Вспомогательная функция, оставили из ЛР №3.
   ------------------------------------------------------------------ */
export function pluralize(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}