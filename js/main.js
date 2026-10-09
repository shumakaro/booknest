/* ==========================================================================
   main.js — точка входа приложения BookNest (ЛР №4).

   Здесь сходятся три вещи:
     1. state — единственный объект состояния приложения;
     2. обработчики событий — реагируют на ввод, клики, пагинацию;
     3. логика поиска с debounce и отменой устаревших запросов.

   Что изменилось по сравнению с ЛР №3:
     - источник данных — не локальный массив, а Open Library API;
     - появились четыре состояния интерфейса (loading/success/empty/error);
     - поиск идёт через debounce, чтобы не улетало 15 запросов на 15 букв;
     - устаревшие запросы отменяются через AbortController;
     - добавлена пагинация по 20 записей;
     - ошибки различаются по типу: сеть (status 0), 4xx, 5xx.

   ВАЖНО (для защиты): ровно один объект state. Любое изменение состояния
   приводит к вызову render-логики, которая решает, какое из четырёх
   состояний показать.
   ========================================================================== */

// Импортируем функции запросов из слоя API.
// Обрати внимание: fetch здесь НЕ вызывается — только наши обёртки.
import { searchBooks, ApiError } from "./api/books.js";
import { debounce } from "./lib/debounce.js";

import {
  showState,
  renderSearchResults,
  renderPagination,
  renderWishlistCount,
  pluralize,
} from "./ui/render.js";

/* ------------------------------------------------------------------
   Элементы страницы.
   ------------------------------------------------------------------ */
const searchInput      = document.querySelector("#search");
const resultsCounterEl = document.querySelector("#counter");
const wishlistCountEl  = document.querySelector("#wishlist-count");
const retryBtn         = document.querySelector("#state-error-retry");
const bookListEl       = document.querySelector("#book-list");
const prevBtn          = document.querySelector("#pagination-prev");
const nextBtn          = document.querySelector("#pagination-next");

/* ------------------------------------------------------------------
   Состояние приложения.

   Поля:
     query         — что введено в поиск;
     page          — текущая страница пагинации (1-based);
     loading       — идёт ли запрос прямо сейчас;
     docs          — результаты последнего успешного запроса;
     totalPages    — всего страниц (или null, если неизвестно);
     wishlist      — Set с OLID книг в списке желаемого.
   ------------------------------------------------------------------ */
const state = {
  query: "",
  page: 1,
  loading: false,
  docs: [],
  totalPages: null,
  wishlist: new Set(),
};

/* ------------------------------------------------------------------
   Ключи localStorage.
   ------------------------------------------------------------------ */
const STORAGE_WISHLIST_KEY = "booknest:wishlist";

/* ------------------------------------------------------------------
   activeController — AbortController текущего запроса.

   Объявлен до функции runSearch, потому что используется внутри неё.
   Хранит ссылку на контроллер последнего запроса, чтобы можно было
   отменить его при новом вводе.
   ------------------------------------------------------------------ */
let activeController = null;

/* ------------------------------------------------------------------
   readWishlistFromStorage — прочитать список желаемого из localStorage.
   Защищено try/catch, как в ЛР №3. Если данных нет или они битые —
   возвращаем пустой массив.
   ------------------------------------------------------------------ */
function readWishlistFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Оставляем только строки — OLID в Open Library это строки
    // вида "OL27448W", а не числа, как было в ЛР №3.
    return parsed.filter((id) => typeof id === "string");
  } catch (error) {
    console.warn("Не удалось прочитать список желаемого:", error);
    return [];
  }
}

/* ------------------------------------------------------------------
   saveWishlist — сохранить список желаемого в localStorage.
   ------------------------------------------------------------------ */
function saveWishlist() {
  try {
    localStorage.setItem(
      STORAGE_WISHLIST_KEY,
      JSON.stringify([...state.wishlist])
    );
  } catch (error) {
    console.warn("Не удалось сохранить список желаемого:", error);
  }
}

/* ------------------------------------------------------------------
   humanizeError — превратить объект ошибки в понятный текст для UI.

   Принимает error — объект, который может быть ApiError или любой другой.
   Возвращает строку, которую покажем пользователю.

   ВАЖНО (для защиты): разные типы ошибок — разные сообщения. Это требование
   задания. Сеть (status 0), 4xx и 5xx должны выглядеть по-разному.
   ------------------------------------------------------------------ */
function humanizeError(error) {
  // Сетевая ошибка — наш client.js оборачивает её в ApiError со status 0.
  if (error instanceof ApiError && error.status === 0) {
    return "Не удалось подключиться к серверу. Проверьте интернет-соединение.";
  }

  // 404 — отдельный случай для страницы деталей, но в поиске тоже
  // может встретиться.
  if (error instanceof ApiError && error.status === 404) {
    return "Книга не найдена.";
  }

  // Остальные 4xx — ошибки клиента.
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return "Запрос отклонён сервером. Попробуйте изменить условия поиска.";
  }

  // 5xx — ошибки сервера. Проблема на стороне Open Library.
  if (error instanceof ApiError && error.status >= 500) {
    return "Ошибка сервера. Попробуйте позже.";
  }

  // Всё остальное — неожиданная ошибка.
  return "Что-то пошло не так. Попробуйте ещё раз.";
}

/* ------------------------------------------------------------------
   runSearch — выполнить поиск по текущему state.query и state.page.

   Логика:
     1. Если запрос короче 3 символов — показываем empty и выходим.
     2. Отменяем предыдущий запрос через AbortController.
     3. Показываем loading.
     4. Отправляем запрос через searchBooks.
     5. Обрабатываем результат:
        - успех и есть книги → success;
        - успех и пусто → empty;
        - ошибка → error с человеческим текстом.
     6. В finally снимаем loading.
   ------------------------------------------------------------------ */
async function runSearch() {
  // Проверка минимальной длины. Это требование задания: не отправлять
  // запрос на каждую букву, минимум 3 символа.
  const query = state.query.trim();
  if (query.length < 3) {
    state.docs = [];
    state.totalPages = null;
    showState("empty");
    if (resultsCounterEl) resultsCounterEl.textContent = "";
    return;
  }

  // Отменяем предыдущий незавершённый запрос, если он был.
  if (activeController) {
    activeController.abort();
  }
  activeController = new AbortController();

  // Показываем загрузку. Это ОДНО из четырёх состояний,
  // остальные скрываются внутри showState.
  state.loading = true;
  showState("loading");

  try {
    const data = await searchBooks(query, activeController.signal, state.page);

    // data.docs — массив книг, data.numFound — общее количество.
    // Open Library возвращает это в ответе на /search.json.
    state.docs = Array.isArray(data.docs) ? data.docs : [];

    // Вычисляем количество страниц: общее число / 20 (наш limit),
    // округляем вверх. Если numFound нет — оставляем null.
    if (typeof data.numFound === "number" && data.numFound > 0) {
      state.totalPages = Math.ceil(data.numFound / 20);
    } else {
      state.totalPages = null;
    }

    if (state.docs.length === 0) {
      // Успешный запрос, но результатов нет.
      showState("empty");
      if (resultsCounterEl) resultsCounterEl.textContent = "";
    } else {
      // Успех — рендерим карточки.
      showState("success");
      renderSearchResults(state.docs, state.wishlist);
      renderPagination(state.page, state.totalPages);
      if (resultsCounterEl) {
        const word = pluralize(state.docs.length, "книга", "книги", "книг");
        resultsCounterEl.textContent = `Найдено: ${state.docs.length} ${word}`;
      }
    }
  } catch (error) {
    // Отмена запроса — не ошибка. Просто выходим, ничего не показываем.
    // Пользователь продолжает печатать, и следующий runSearch
    // отправит новый запрос.
    if (error.name === "AbortError") {
      return;
    }

    // Настоящая ошибка — показываем состояние error с текстом.
    showState("error", humanizeError(error));
  } finally {
    // ВАЖНО (для защиты): снятие индикатора загрузки ОБЯЗАТЕЛЬНО
    // в finally. Иначе при ошибке (или отмене) приложение может
    // зависнуть в состоянии loading навсегда.
    state.loading = false;
  }
}

/* ------------------------------------------------------------------
   debouncedSearch — обёртка над runSearch с задержкой 350 мс.

   Пока пользователь печатает, вызовы debouncedSearch перезапускают
   таймер. Запрос уйдёт только через 350 мс после последней буквы.
   ------------------------------------------------------------------ */
const debouncedSearch = debounce(() => {
  // При новом поиске сбрасываем страницу на первую.
  state.page = 1;
  runSearch();
}, 350);

/* ------------------------------------------------------------------
   Обработчик ввода в поле поиска.
   ------------------------------------------------------------------ */
if (searchInput) {
  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    debouncedSearch();
  });
}

/* ------------------------------------------------------------------
   Обработчик клика по кнопке «Повторить» в состоянии ошибки.
   ------------------------------------------------------------------ */
if (retryBtn) {
  retryBtn.addEventListener("click", () => {
    runSearch();
  });
}

/* ------------------------------------------------------------------
   Делегирование кликов по кнопке «Хочу прочитать».
   ------------------------------------------------------------------ */
if (bookListEl) {
  bookListEl.addEventListener("click", (event) => {
    const wishBtn = event.target.closest(".js-wish");
    if (!wishBtn) return;

    const olid = wishBtn.dataset.olid;
    if (state.wishlist.has(olid)) {
      state.wishlist.delete(olid);
    } else {
      state.wishlist.add(olid);
    }
    saveWishlist();
    renderSearchResults(state.docs, state.wishlist);
    if (wishlistCountEl) {
      renderWishlistCount(wishlistCountEl, state.wishlist.size);
    }
  });
}

/* ------------------------------------------------------------------
   Обработчики кнопок пагинации.
   ------------------------------------------------------------------ */
if (prevBtn) {
  prevBtn.addEventListener("click", () => {
    if (state.page > 1) {
      state.page -= 1;
      runSearch();
    }
  });
}

if (nextBtn) {
  nextBtn.addEventListener("click", () => {
    if (state.totalPages === null || state.page < state.totalPages) {
      state.page += 1;
      runSearch();
    }
  });
}

/* ==================================================================
   СТАРТ ПРИЛОЖЕНИЯ.
   ================================================================== */

// 1. Восстанавливаем список желаемого из localStorage.
state.wishlist = new Set(readWishlistFromStorage());

// 2. Обновляем счётчик в шапке.
if (wishlistCountEl) {
  renderWishlistCount(wishlistCountEl, state.wishlist.size);
}

// 3. Показываем пустое состояние — пользователь ещё ничего не искал.
showState("empty");