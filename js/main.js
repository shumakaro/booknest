/* ==========================================================================
   main.js — точка входа приложения BookNest (ЛР №4).

   Здесь находится основная логика интерфейса:

   1. единый объект state;
   2. поиск книг через Open Library API;
   3. debounce 350 мс;
   4. отмена устаревших запросов через AbortController;
   5. четыре состояния: loading, success, empty, error;
   6. накопительная загрузка «Показать ещё»;
   7. wishlist через localStorage;
   8. страница профиля;
   9. экспорт и импорт wishlist в JSON.

   ВАЖНО (для защиты):
   fetch здесь НЕ вызывается.
   Все сетевые запросы идут через api/books.js → api/client.js.
   ========================================================================== */

import {
  searchBooks,
  getBookById,
} from "../api/books.js";

import { ApiError } from "../api/client.js";

import { debounce } from "./lib/debounce.js";

import {
  showState,
  renderSearchResults,
  renderWishlistCount,
  pluralize,
} from "./ui/render.js";

/* ==========================================================================
   ЭЛЕМЕНТЫ СТРАНИЦЫ КАТАЛОГА
   ========================================================================== */

const searchInput = document.querySelector("#search");

const resultsCounterEl =
  document.querySelector("#counter");

const wishlistCountEl =
  document.querySelector("#wishlist-count");

const retryBtn =
  document.querySelector("#state-error-retry");

const bookListEl =
  document.querySelector("#book-list");

// Новая кнопка вместо пагинации.
const loadMoreBtn =
  document.querySelector("#load-more");

/* ==========================================================================
   ЭЛЕМЕНТЫ СТРАНИЦЫ ПРОФИЛЯ
   ========================================================================== */

const wishlistListEl =
  document.querySelector("#wishlist-list");

const wishlistLoadingEl =
  document.querySelector("#wishlist-loading");

const wishlistEmptyEl =
  document.querySelector("#wishlist-empty");

const wishlistErrorEl =
  document.querySelector("#wishlist-error");

const wishlistSuccessEl =
  document.querySelector("#wishlist-success");

const wishlistErrorTextEl =
  document.querySelector("#wishlist-error-text");

const wishlistRetryBtn =
  document.querySelector("#wishlist-error-retry");

/* ==========================================================================
   ЭКСПОРТ И ИМПОРТ
   ========================================================================== */

const exportBtn =
  document.querySelector("#export");

const importInput =
  document.querySelector("#import");

/* ------------------------------------------------------------------
   Определяем, открыта ли страница профиля.

   Если #wishlist-list существует — значит сейчас profile.html.
   ------------------------------------------------------------------ */

const isProfilePage =
  wishlistListEl !== null;

/* ==========================================================================
   СОСТОЯНИЕ ПРИЛОЖЕНИЯ

   ВАЖНО:
   у приложения остаётся ровно ОДИН объект state.
   ========================================================================== */

const state = {
  // Текущий поисковый запрос.
  query: "",

  // Последняя успешно загруженная страница API.
  page: 1,

  // Идёт ли сейчас запрос.
  loading: false,

  // Все загруженные книги.
  // При «Показать ещё» новые книги добавляются сюда.
  docs: [],

  // Общее количество страниц.
  totalPages: null,

  // OLID книг из списка желаемого.
  wishlist: new Set(),
};

/* ==========================================================================
   LOCALSTORAGE
   ========================================================================== */

const STORAGE_WISHLIST_KEY =
  "booknest:wishlist";

/* ------------------------------------------------------------------
   readWishlistFromStorage — читает wishlist.

   Если localStorage пустой или JSON испорчен,
   просто возвращаем пустой массив.
   ------------------------------------------------------------------ */

function readWishlistFromStorage() {
  try {
    const raw =
      localStorage.getItem(
        STORAGE_WISHLIST_KEY
      );

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    // OLID — строки вида OL27448W.
    return parsed.filter(
      (id) => typeof id === "string"
    );
  } catch (error) {
    console.warn(
      "Не удалось прочитать wishlist:",
      error
    );

    return [];
  }
}

/* ------------------------------------------------------------------
   saveWishlist — сохраняет Set в localStorage.

   Set напрямую в JSON сохранить нельзя,
   поэтому сначала превращаем его в массив.
   ------------------------------------------------------------------ */

function saveWishlist() {
  try {
    localStorage.setItem(
      STORAGE_WISHLIST_KEY,
      JSON.stringify(
        [...state.wishlist]
      )
    );
  } catch (error) {
    console.warn(
      "Не удалось сохранить wishlist:",
      error
    );
  }
}

/* ==========================================================================
   СОСТОЯНИЯ WISHLIST НА СТРАНИЦЕ ПРОФИЛЯ
   ========================================================================== */

/* ------------------------------------------------------------------
   showWishlistState — показывает только одно состояние:

   loading
   empty
   error
   success
   ------------------------------------------------------------------ */

function showWishlistState(
  name,
  text = ""
) {
  const states = [
    wishlistLoadingEl,
    wishlistEmptyEl,
    wishlistErrorEl,
    wishlistSuccessEl,
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

  if (
    name === "error" &&
    wishlistErrorTextEl
  ) {
    wishlistErrorTextEl.textContent =
      text;
  }
}

/* ------------------------------------------------------------------
   renderWishlistPage — выводит книги wishlist.

   Здесь используем createElement и textContent,
   а не вставляем данные API прямо через HTML-строку.
   ------------------------------------------------------------------ */

function renderWishlistPage(books) {
  if (!wishlistListEl) {
    return;
  }

  // Очищаем предыдущий список.
  wishlistListEl.textContent = "";

  books.forEach((book) => {
    const olid =
      typeof book.key === "string"
        ? book.key.replace(
            "/works/",
            ""
          )
        : "";

    const item =
      document.createElement("li");

    item.className =
      "wishlist__item";

    const title =
      document.createElement("h4");

    title.className =
      "wishlist__book-title";

    title.textContent =
      book.title ||
      "Без названия";

    const button =
      document.createElement("button");

    button.type = "button";

    button.className =
      "btn btn--ghost js-wishlist-remove";

    button.dataset.olid = olid;

    button.textContent =
      "Удалить";

    item.append(
      title,
      button
    );

    wishlistListEl.append(item);
  });
}

/* ------------------------------------------------------------------
   loadWishlist — загружает данные книг из API по сохранённым OLID.
   ------------------------------------------------------------------ */

async function loadWishlist() {
  const olids =
    [...state.wishlist];

  if (olids.length === 0) {
    if (wishlistListEl) {
      wishlistListEl.textContent = "";
    }

    showWishlistState("empty");

    return;
  }

  showWishlistState("loading");

  try {
    // Книги независимы друг от друга,
    // поэтому загружаем их параллельно.
    const books =
      await Promise.all(
        olids.map((olid) =>
          getBookById(olid)
        )
      );

    renderWishlistPage(books);

    showWishlistState("success");
  } catch (error) {
    if (
      error.name === "AbortError"
    ) {
      return;
    }

    showWishlistState(
      "error",
      humanizeError(error)
    );
  }
}

/* ==========================================================================
   ОБРАБОТКА ОШИБОК
   ========================================================================== */

/* ------------------------------------------------------------------
   humanizeError — превращает техническую ошибку
   в понятный текст интерфейса.
   ------------------------------------------------------------------ */

function humanizeError(error) {
  // Нет сети.
  if (
    error instanceof ApiError &&
    error.status === 0
  ) {
    return (
      "Не удалось подключиться к серверу. " +
      "Проверьте интернет-соединение."
    );
  }

  // Книга или ресурс не найден.
  if (
    error instanceof ApiError &&
    error.status === 404
  ) {
    return "Книга не найдена.";
  }

  // Другие ошибки пользователя / клиента.
  if (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500
  ) {
    return (
      "Запрос отклонён сервером. " +
      "Попробуйте изменить условия поиска."
    );
  }

  // Ошибка Open Library.
  if (
    error instanceof ApiError &&
    error.status >= 500
  ) {
    return (
      "Ошибка сервера. " +
      "Попробуйте позже."
    );
  }

  return (
    "Что-то пошло не так. " +
    "Попробуйте ещё раз."
  );
}

/* ==========================================================================
   ABORTCONTROLLER
   ========================================================================== */

// Контроллер последнего поискового запроса.
//
// Когда пользователь продолжает печатать,
// предыдущий запрос можно отменить.
let activeController = null;

/* ==========================================================================
   КНОПКА «ПОКАЗАТЬ ЕЩЁ»
   ========================================================================== */

/* ------------------------------------------------------------------
   updateLoadMoreButton — решает, надо ли показывать кнопку.

   Если последняя страница уже загружена,
   кнопка скрывается.
   ------------------------------------------------------------------ */

function updateLoadMoreButton() {
  if (!loadMoreBtn) {
    return;
  }

  const hasBooks =
    state.docs.length > 0;

  const hasNextPage =
    state.totalPages !== null &&
    state.page < state.totalPages;

  loadMoreBtn.hidden =
    !hasBooks ||
    !hasNextPage;

  loadMoreBtn.disabled =
    state.loading;

  if (!state.loading) {
    loadMoreBtn.textContent =
      "Показать ещё";
  }
}

/* ==========================================================================
   ПОИСК
   ========================================================================== */

/* ------------------------------------------------------------------
   runSearch — выполняет запрос к API.

   page:
     какую страницу Open Library нужно получить.

   append:
     false — новый поиск, старые книги заменяются;
     true  — «Показать ещё», новые книги добавляются ниже.

   Это главное отличие накопительной загрузки от обычной пагинации.
   ------------------------------------------------------------------ */

async function runSearch({
  page = 1,
  append = false,
} = {}) {
  const query =
    state.query.trim();

  /* ----------------------------------------------------------------
     Минимальная длина запроса — 3 символа.
     ---------------------------------------------------------------- */

  if (query.length < 3) {
    state.docs = [];
    state.page = 1;
    state.totalPages = null;

    showState("empty");

    if (resultsCounterEl) {
      resultsCounterEl.textContent = "";
    }

    updateLoadMoreButton();

    return;
  }

  /* ----------------------------------------------------------------
     Отменяем предыдущий незавершённый запрос.
     ---------------------------------------------------------------- */

  if (activeController) {
    activeController.abort();
  }

  activeController =
    new AbortController();

  state.loading = true;

  /* ----------------------------------------------------------------
     Для НОВОГО поиска показываем полноценный loading.

     При «Показать ещё» уже загруженные книги не скрываем.
     Меняем только текст кнопки.
     ---------------------------------------------------------------- */

  if (!append) {
    showState("loading");
  } else if (loadMoreBtn) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent =
      "Загрузка...";
  }

  try {
    /* --------------------------------------------------------------
       Получаем одну страницу результатов.

       В api/books.js эта функция также проверяет кэш Map.
       -------------------------------------------------------------- */

    const data =
      await searchBooks(
        query,
        activeController.signal,
        page
      );

    const newDocs =
      Array.isArray(data.docs)
        ? data.docs
        : [];

    /* --------------------------------------------------------------
       Если это «Показать ещё» —
       добавляем новые книги к старым.

       Если новый поиск —
       полностью заменяем список.
       -------------------------------------------------------------- */

    if (append) {
      state.docs = [
        ...state.docs,
        ...newDocs,
      ];
    } else {
      state.docs = newDocs;
    }

    // Страница считается загруженной
    // только после успешного ответа.
    state.page = page;

    /* --------------------------------------------------------------
       Open Library возвращает numFound —
       общее количество найденных книг.

       limit = 20, поэтому вычисляем количество страниц.
       -------------------------------------------------------------- */

    if (
      typeof data.numFound ===
        "number" &&
      data.numFound > 0
    ) {
      state.totalPages =
        Math.ceil(
          data.numFound / 20
        );
    } else {
      state.totalPages = null;
    }

    /* --------------------------------------------------------------
       Если первый запрос ничего не нашёл —
       показываем empty.
       -------------------------------------------------------------- */

    if (
      state.docs.length === 0
    ) {
      showState("empty");

      if (resultsCounterEl) {
        resultsCounterEl.textContent =
          "";
      }

      updateLoadMoreButton();

      return;
    }

    /* --------------------------------------------------------------
       Успешное состояние.

       При «Показать ещё» render получает ВСЕ накопленные книги:
       сначала 20, затем 40, 60 и т.д.
       -------------------------------------------------------------- */

    showState("success");

    renderSearchResults(
      state.docs,
      state.wishlist
    );

    /* --------------------------------------------------------------
       Счётчик показывает количество книг,
       которые уже загружены на страницу.
       -------------------------------------------------------------- */

    if (resultsCounterEl) {
      const word = pluralize(
        state.docs.length,
        "книга",
        "книги",
        "книг"
      );

      resultsCounterEl.textContent =
        `Показано: ${state.docs.length} ${word}`;
    }

    updateLoadMoreButton();
  } catch (error) {
    /* --------------------------------------------------------------
       AbortError возникает, когда пользователь быстро печатает
       и старый запрос отменяется.

       Его пользователю не показываем.
       -------------------------------------------------------------- */

    if (
      error.name === "AbortError"
    ) {
      return;
    }

    showState(
      "error",
      humanizeError(error)
    );
  } finally {
    state.loading = false;

    updateLoadMoreButton();
  }
}

/* ==========================================================================
   DEBOUNCE
   ========================================================================== */

/* ------------------------------------------------------------------
   Запрос запускается через 350 мс после последней введённой буквы.

   При НОВОМ поиске:
     page → 1;
     docs → [];
   ------------------------------------------------------------------ */

const debouncedSearch =
  debounce(() => {
    state.page = 1;
    state.docs = [];
    state.totalPages = null;

    runSearch({
      page: 1,
      append: false,
    });
  }, 350);

/* ==========================================================================
   СОБЫТИЯ КАТАЛОГА
   ========================================================================== */

/* ------------------------------------------------------------------
   Ввод текста поиска.
   ------------------------------------------------------------------ */

if (searchInput) {
  searchInput.addEventListener(
    "input",
    (event) => {
      state.query =
        event.target.value;

      debouncedSearch();
    }
  );
}

/* ------------------------------------------------------------------
   Кнопка «Повторить» после ошибки поиска.

   Повторяем первый запрос текущего поиска.
   ------------------------------------------------------------------ */

if (retryBtn) {
  retryBtn.addEventListener(
    "click",
    () => {
      state.page = 1;
      state.docs = [];

      runSearch({
        page: 1,
        append: false,
      });
    }
  );
}

/* ------------------------------------------------------------------
   Кнопка «Показать ещё».

   Например:

   сейчас page = 1
   ↓
   нажали кнопку
   ↓
   запрашиваем page = 2
   ↓
   новые 20 книг добавляются к предыдущим.
   ------------------------------------------------------------------ */

if (loadMoreBtn) {
  loadMoreBtn.addEventListener(
    "click",
    () => {
      if (state.loading) {
        return;
      }

      if (
        state.totalPages !== null &&
        state.page >=
          state.totalPages
      ) {
        return;
      }

      runSearch({
        page: state.page + 1,
        append: true,
      });
    }
  );
}

/* ------------------------------------------------------------------
   Добавление / удаление книги из wishlist в каталоге.

   Используем делегирование событий:
   один listener находится на всём списке книг.
   ------------------------------------------------------------------ */

if (bookListEl) {
  bookListEl.addEventListener(
    "click",
    (event) => {
      const wishBtn =
        event.target.closest(
          ".js-wish"
        );

      if (!wishBtn) {
        return;
      }

      const olid =
        wishBtn.dataset.olid;

      if (!olid) {
        return;
      }

      if (
        state.wishlist.has(olid)
      ) {
        state.wishlist.delete(
          olid
        );
      } else {
        state.wishlist.add(
          olid
        );
      }

      saveWishlist();

      // Перерисовываем все накопленные книги,
      // чтобы изменить состояние кнопки wishlist.
      renderSearchResults(
        state.docs,
        state.wishlist
      );

      if (wishlistCountEl) {
        renderWishlistCount(
          wishlistCountEl,
          state.wishlist.size
        );
      }
    }
  );
}

/* ==========================================================================
   СОБЫТИЯ ПРОФИЛЯ
   ========================================================================== */

/* ------------------------------------------------------------------
   Удаление книги из wishlist.
   ------------------------------------------------------------------ */

if (wishlistListEl) {
  wishlistListEl.addEventListener(
    "click",
    (event) => {
      const removeButton =
        event.target.closest(
          ".js-wishlist-remove"
        );

      if (!removeButton) {
        return;
      }

      const olid =
        removeButton.dataset.olid;

      if (!olid) {
        return;
      }

      state.wishlist.delete(olid);

      saveWishlist();

      if (wishlistCountEl) {
        renderWishlistCount(
          wishlistCountEl,
          state.wishlist.size
        );
      }

      loadWishlist();
    }
  );
}

/* ------------------------------------------------------------------
   Повторная загрузка wishlist после ошибки.
   ------------------------------------------------------------------ */

if (wishlistRetryBtn) {
  wishlistRetryBtn.addEventListener(
    "click",
    () => {
      loadWishlist();
    }
  );
}

/* ==========================================================================
   ЭКСПОРТ JSON
   ========================================================================== */

if (exportBtn) {
  exportBtn.addEventListener(
    "click",
    () => {
      // Set → массив.
      const wishlistArray =
        [...state.wishlist];

      // Массив → красивый JSON.
      const json =
        JSON.stringify(
          wishlistArray,
          null,
          2
        );

      // Создаём файл в памяти браузера.
      const blob =
        new Blob(
          [json],
          {
            type:
              "application/json",
          }
        );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        "booknest-wishlist.json";

      link.click();

      URL.revokeObjectURL(url);
    }
  );
}

/* ==========================================================================
   ИМПОРТ JSON
   ========================================================================== */

if (importInput) {
  importInput.addEventListener(
    "change",
    async (event) => {
      const file =
        event.target.files[0];

      if (!file) {
        return;
      }

      try {
        // Читаем файл.
        const text =
          await file.text();

        // JSON-текст → JavaScript.
        const data =
          JSON.parse(text);

        // Ожидаем массив OLID.
        if (!Array.isArray(data)) {
          throw new Error(
            "Неверный формат JSON"
          );
        }

        // Оставляем только строки.
        const validIds =
          data.filter(
            (id) =>
              typeof id ===
              "string"
          );

        state.wishlist =
          new Set(validIds);

        saveWishlist();

        /* ----------------------------------------------------------
           Обновляем счётчик.
           ---------------------------------------------------------- */

        if (wishlistCountEl) {
          renderWishlistCount(
            wishlistCountEl,
            state.wishlist.size
          );
        }

        /* ----------------------------------------------------------
           Если импорт выполнен на profile.html —
           перезагружаем список.
           ---------------------------------------------------------- */

        if (isProfilePage) {
          loadWishlist();
        }

        /* ----------------------------------------------------------
           Если импорт выполнен в каталоге —
           обновляем кнопки wishlist.
           ---------------------------------------------------------- */

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

      // Позволяет снова выбрать тот же файл.
      event.target.value = "";
    }
  );
}

/* ==========================================================================
   СТАРТ ПРИЛОЖЕНИЯ
   ========================================================================== */

// 1. Восстанавливаем wishlist.
state.wishlist =
  new Set(
    readWishlistFromStorage()
  );

// 2. Обновляем счётчик.
if (wishlistCountEl) {
  renderWishlistCount(
    wishlistCountEl,
    state.wishlist.size
  );
}

// 3. Для каталога начальное состояние — empty.
showState("empty");

// 4. Подготавливаем кнопку «Показать ещё».
updateLoadMoreButton();

// 5. На profile.html загружаем wishlist.
if (isProfilePage) {
  loadWishlist();
}