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
import { searchBooks, getBookById } from "../api/books.js";
import { ApiError } from "../api/client.js";
import { debounce } from "./lib/debounce.js";

import {
  showState,
  renderSearchResults,
  renderPagination,
  renderWishlistCount,
  pluralize,
} from "./ui/render.js";

/* ------------------------------------------------------------------
   Элементы страницы каталога.
   ------------------------------------------------------------------ */

const searchInput = document.querySelector("#search");
const resultsCounterEl = document.querySelector("#counter");
const wishlistCountEl = document.querySelector("#wishlist-count");
const retryBtn = document.querySelector("#state-error-retry");
const bookListEl = document.querySelector("#book-list");
const prevBtn = document.querySelector("#pagination-prev");
const nextBtn = document.querySelector("#pagination-next");

// Элементы страницы профиля.
const wishlistListEl = document.querySelector("#wishlist-list");
const wishlistLoadingEl = document.querySelector("#wishlist-loading");
const wishlistEmptyEl = document.querySelector("#wishlist-empty");
const wishlistErrorEl = document.querySelector("#wishlist-error");
const wishlistSuccessEl = document.querySelector("#wishlist-success");
const wishlistErrorTextEl = document.querySelector("#wishlist-error-text");
const wishlistRetryBtn = document.querySelector("#wishlist-error-retry");



// Кнопки экспорта и импорта.
const exportBtn = document.querySelector("#export");
const importInput = document.querySelector("#import");

// Проверяем, открыта ли страница профиля.
const isProfilePage = wishlistListEl !== null;

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

// Показывает одно состояние wishlist и скрывает остальные.
function showWishlistState(name, text = "") {
  const states = [
    wishlistLoadingEl,
    wishlistEmptyEl,
    wishlistErrorEl,
    wishlistSuccessEl
  ];

  states.forEach((element) => {
    if (element) {
      element.hidden = true;
    }
  });

  let target = null;

  if (name === "loading") {
    target = wishlistLoadingEl;
  } else if (name === "empty") {
    target = wishlistEmptyEl;
  } else if (name === "error") {
    target = wishlistErrorEl;
  } else if (name === "success") {
    target = wishlistSuccessEl;
  }

  if (target) {
    target.hidden = false;
  }

  if (name === "error" && wishlistErrorTextEl) {
    wishlistErrorTextEl.textContent = text;
  }
}

// Отрисовывает книги из wishlist на странице профиля.
function renderWishlistPage(books) {
  // Если мы не на странице профиля — ничего не делаем.
  if (!wishlistListEl) {
    return;
  }

  // Перед новой отрисовкой очищаем список.
  wishlistListEl.innerHTML = "";

  // Создаём элементы для каждой книги.
  books.forEach((book) => {
    // OLID хранится в поле key в формате "/works/OL..."
    const olid = book.key.replace("/works/", "");

    // Создаём <li>.
    const item = document.createElement("li");
    item.className = "wishlist__item";

    // Создаём название книги.
    const title = document.createElement("h4");
    title.className = "wishlist__book-title";
    title.textContent = book.title || "Без названия";

    // Создаём кнопку удаления.
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn--ghost js-wishlist-remove";
    button.dataset.olid = olid;
    button.textContent = "Удалить";

    // Собираем карточку.
    item.append(title);
    item.append(button);

    // Добавляем её в список.
    wishlistListEl.append(item);
  });
}

// Загружает данные книг из wishlist через API.
async function loadWishlist() {
  // Получаем массив OLID из Set.
  const olids = [...state.wishlist];

  // Если список пустой — показываем empty.
  if (olids.length === 0) {
    if (wishlistListEl) {
      wishlistListEl.innerHTML = "";
    }

    showWishlistState("empty");
    return;
  }

  // Показываем загрузку.
  showWishlistState("loading");

  try {
    // Все книги загружаются параллельно.
    const books = await Promise.all(
      olids.map((olid) => getBookById(olid))
    );

    // Отрисовываем книги.
    renderWishlistPage(books);

    // Показываем успешное состояние.
    showWishlistState("success");
  } catch (error) {
    // Отменённый запрос не считаем ошибкой.
    if (error.name === "AbortError") {
      return;
    }

    // Показываем понятное сообщение.
    showWishlistState(
      "error",
      humanizeError(error)
    );
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
   Удаление книги из wishlist на странице профиля.

   Используем делегирование событий:
   один обработчик стоит на всём списке, а не на каждой кнопке.
   ------------------------------------------------------------------ */
if (wishlistListEl) {
  wishlistListEl.addEventListener("click", (event) => {
    // Проверяем, нажата ли кнопка удаления.
    const removeButton = event.target.closest(".js-wishlist-remove");

    if (!removeButton) {
      return;
    }

    // Получаем OLID книги из data-атрибута кнопки.
    const olid = removeButton.dataset.olid;

    // Удаляем книгу из Set.
    state.wishlist.delete(olid);

    // Сохраняем новый wishlist в localStorage.
    saveWishlist();

    // Обновляем счётчик в шапке.
    if (wishlistCountEl) {
      renderWishlistCount(
        wishlistCountEl,
        state.wishlist.size
      );
    }

    // Перезагружаем список на странице профиля.
    loadWishlist();
  });
}

/* ------------------------------------------------------------------
   Повторная загрузка wishlist после ошибки.
   ------------------------------------------------------------------ */
if (wishlistRetryBtn) {
  wishlistRetryBtn.addEventListener("click", () => {
    loadWishlist();
  });
}

/* ------------------------------------------------------------------
   Экспорт списка желаемого в JSON-файл.
   ------------------------------------------------------------------ */
if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    // Превращаем Set в обычный массив.
    const wishlistArray = [...state.wishlist];

    // Превращаем массив в JSON-строку.
    const json = JSON.stringify(wishlistArray, null, 2);

    // Создаём виртуальный файл в памяти браузера.
    const blob = new Blob(
      [json],
      { type: "application/json" }
    );

    // Создаём временную ссылку на этот файл.
    const url = URL.createObjectURL(blob);

    // Создаём временную ссылку <a>.
    const link = document.createElement("a");

    link.href = url;
    link.download = "booknest-wishlist.json";

    // Запускаем скачивание.
    link.click();

    // Удаляем временную ссылку из памяти.
    URL.revokeObjectURL(url);
  });
}

/* ------------------------------------------------------------------
   Импорт списка желаемого из JSON-файла.
   ------------------------------------------------------------------ */
if (importInput) {
  importInput.addEventListener("change", async (event) => {
    // Получаем выбранный файл.
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    try {
      // Читаем файл как текст.
      const text = await file.text();

      // Превращаем JSON-текст обратно в JavaScript.
      const data = JSON.parse(text);

      // Проверяем, что внутри именно массив.
      if (!Array.isArray(data)) {
        throw new Error("Неверный формат файла");
      }

      // Оставляем только строки,
      // потому что wishlist хранит OLID.
      const validIds = data.filter(
        (id) => typeof id === "string"
      );

      // Создаём новый Set.
      state.wishlist = new Set(validIds);

      // Сохраняем импортированный список.
      saveWishlist();

      // Обновляем счётчик.
      if (wishlistCountEl) {
        renderWishlistCount(
          wishlistCountEl,
          state.wishlist.size
        );
      }

      // Если мы на странице профиля —
      // заново загружаем книги через API.
      if (isProfilePage) {
        loadWishlist();
      }

      // Если мы в каталоге —
      // обновляем состояние кнопок.
      if (bookListEl) {
        renderSearchResults(
          state.docs,
          state.wishlist
        );
      }

    } catch (error) {
      console.warn(
        "Не удалось импортировать wishlist:",
        error
      );

      alert(
        "Не удалось прочитать файл. Проверьте формат JSON."
      );
    }

    // Сбрасываем input.
    // Это позволяет выбрать тот же файл повторно.
    event.target.value = "";
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

// Если открыта страница профиля,
// загружаем список желаемого.
if (isProfilePage) {
  loadWishlist();
}