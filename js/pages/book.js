/* ==========================================================================
   pages/book.js — логика страницы деталей одной книги.

   Страница открывается по адресу:
   book.html?id=OL12345W

   Что делает этот модуль:
   1. Читает id книги из URL.
   2. Показывает loading.
   3. Загружает данные книги через API.
   4. Параллельно загружает данные авторов через Promise.allSettled.
   5. Даже если часть запросов авторов завершилась ошибкой,
      страница книги всё равно продолжает работать.
   6. Показывает content или error.

   ВАЖНО (для защиты):
   fetch здесь НЕ используется напрямую.
   Все сетевые запросы идут через api/books.js → api/client.js.
   ========================================================================== */

import { getBookById, getAuthor } from "../../api/books.js";
import { ApiError } from "../../api/client.js";

/* ------------------------------------------------------------------
   Элементы страницы.
   ------------------------------------------------------------------ */

const loadingEl = document.querySelector("#details-loading");
const errorEl = document.querySelector("#details-error");
const contentEl = document.querySelector("#details-content");
const errorTextEl = document.querySelector("#details-error-text");
const retryBtn = document.querySelector("#details-error-retry");

/* ------------------------------------------------------------------
   showState — показывает только одно состояние страницы.

   Возможные состояния:
     loading — идёт загрузка;
     error   — произошла ошибка;
     content — данные успешно получены.
   ------------------------------------------------------------------ */
function showState(name, text = "") {
  [loadingEl, errorEl, contentEl].forEach((element) => {
    if (element) {
      element.hidden = true;
    }
  });

  let target = null;

  if (name === "loading") {
    target = loadingEl;
  } else if (name === "error") {
    target = errorEl;
  } else if (name === "content") {
    target = contentEl;
  }

  if (target) {
    target.hidden = false;
  }

  if (name === "error" && errorTextEl) {
    errorTextEl.textContent = text;
  }
}

/* ------------------------------------------------------------------
   getBookIdFromUrl — получает OLID книги из адресной строки.

   Например:
     book.html?id=OL27448W

   функция вернёт:
     "OL27448W"
   ------------------------------------------------------------------ */
function getBookIdFromUrl() {
  const params = new URLSearchParams(location.search);

  return params.get("id");
}

/* ------------------------------------------------------------------
   humanizeError — превращает техническую ошибку
   в понятный текст для пользователя.
   ------------------------------------------------------------------ */
function humanizeError(error) {
  if (error instanceof ApiError && error.status === 404) {
    return "Книга не найдена. Возможно, ссылка устарела.";
  }

  if (error instanceof ApiError && error.status === 0) {
    return "Не удалось подключиться к серверу. Проверьте интернет-соединение.";
  }

  if (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500
  ) {
    return "Ошибка запроса. Попробуйте открыть другую книгу.";
  }

  if (error instanceof ApiError && error.status >= 500) {
    return "Ошибка сервера. Попробуйте позже.";
  }

  return "Что-то пошло не так. Попробуйте ещё раз.";
}

/* ------------------------------------------------------------------
   getDescription — приводит описание книги к обычной строке.

   Open Library может вернуть description:

     "Обычная строка"

   или:

     {
       value: "Текст описания"
     }

   Эта функция обрабатывает оба варианта.
   ------------------------------------------------------------------ */
function getDescription(book) {
  if (typeof book.description === "string") {
    return book.description;
  }

  if (
    book.description &&
    typeof book.description.value === "string"
  ) {
    return book.description.value;
  }

  return "Описание отсутствует.";
}

/* ------------------------------------------------------------------
   renderBook — отрисовывает книгу на странице.

   Принимает:
     book        — данные книги;
     authorNames — массив успешно загруженных имён авторов.

   Для вывода данных используем DOM-элементы и textContent.
   Так данные API не вставляются напрямую через HTML-строку.
   ------------------------------------------------------------------ */
function renderBook(book, authorNames) {
  if (!contentEl) {
    return;
  }

  // Очищаем старые данные.
  contentEl.textContent = "";

  const titleText = book.title || "Без названия";
  const descriptionText = getDescription(book);

  const firstPublished =
    book.first_publish_date || "—";

  const authorText =
    Array.isArray(authorNames) && authorNames.length > 0
      ? authorNames.join(", ")
      : "Автор неизвестен";

  const subjects = Array.isArray(book.subjects)
    ? book.subjects.slice(0, 8)
    : [];

  /* ----------------------------------------------------------------
     Заголовок книги.
     ---------------------------------------------------------------- */
  const title = document.createElement("h1");
  title.className = "book__title";
  title.textContent = titleText;

  contentEl.append(title);

  /* ----------------------------------------------------------------
     Обложка.
     ---------------------------------------------------------------- */
  const coverId =
    Array.isArray(book.covers) && book.covers.length > 0
      ? book.covers[0]
      : null;

  if (coverId) {
    const image = document.createElement("img");

    image.className = "book__cover";
    image.src =
      `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;

    image.alt = `Обложка ${titleText}`;
    image.width = 300;
    image.height = 450;

    contentEl.append(image);
  }

  /* ----------------------------------------------------------------
     Характеристики книги.
     ---------------------------------------------------------------- */
  const specs = document.createElement("dl");
  specs.className = "specs";

  const authorTerm = document.createElement("dt");
  authorTerm.className = "specs__term";
  authorTerm.textContent = "Автор";

  const authorValue = document.createElement("dd");
  authorValue.className = "specs__value";
  authorValue.textContent = authorText;

  const publishTerm = document.createElement("dt");
  publishTerm.className = "specs__term";
  publishTerm.textContent = "Первое издание";

  const publishValue = document.createElement("dd");
  publishValue.className = "specs__value";
  publishValue.textContent = firstPublished;

  specs.append(
    authorTerm,
    authorValue,
    publishTerm,
    publishValue
  );

  // Темы добавляем только если они есть.
  if (subjects.length > 0) {
    const subjectsTerm = document.createElement("dt");
    subjectsTerm.className = "specs__term";
    subjectsTerm.textContent = "Темы";

    const subjectsValue = document.createElement("dd");
    subjectsValue.className = "specs__value";
    subjectsValue.textContent = subjects.join(", ");

    specs.append(
      subjectsTerm,
      subjectsValue
    );
  }

  contentEl.append(specs);

  /* ----------------------------------------------------------------
     Описание книги.
     ---------------------------------------------------------------- */
  const section = document.createElement("section");
  section.className = "book__section";

  const subtitle = document.createElement("h2");
  subtitle.className = "book__subtitle";
  subtitle.textContent = "Описание";

  const description = document.createElement("p");
  description.className = "book__text";
  description.textContent = descriptionText;

  section.append(
    subtitle,
    description
  );

  contentEl.append(section);
}

/* ------------------------------------------------------------------
   currentId — запоминаем текущий id книги.

   Это нужно для кнопки «Повторить»:
   повторный запрос будет выполнен для той же книги.
   ------------------------------------------------------------------ */
let currentId = null;

/* ------------------------------------------------------------------
   loadBook — основной процесс загрузки страницы книги.

   Логика:

   1. Получаем OLID.
   2. Загружаем книгу.
   3. Получаем список OLID авторов.
   4. Все авторы загружаются параллельно.
   5. Для этого используем Promise.allSettled.

   Почему Promise.allSettled:
   Promise.all завершится ошибкой, если упадёт хотя бы один запрос.

   Promise.allSettled ждёт ВСЕ запросы и сообщает результат каждого
   отдельно. Поэтому если один автор не загрузился, остальные авторы
   и сама книга всё равно отображаются.

   Это и есть корректная работа при частичном сбое.
   ------------------------------------------------------------------ */
async function loadBook() {
  const id = currentId || getBookIdFromUrl();

  // Если id отсутствует — запрос вообще не выполняем.
  if (!id) {
    showState(
      "error",
      "Книга не найдена. Возможно, ссылка устарела."
    );

    return;
  }

  currentId = id;

  showState("loading");

  try {
    /* --------------------------------------------------------------
       Шаг 1. Загружаем саму книгу.

       Это критичный запрос.
       Если книга не загрузилась — показывать страницу нельзя.
       -------------------------------------------------------------- */
    const book = await getBookById(id);

    /* --------------------------------------------------------------
       Шаг 2. Получаем OLID авторов.

       Open Library возвращает примерно:

       authors: [
         {
           author: {
             key: "/authors/OL26320A"
           }
         }
       ]
       -------------------------------------------------------------- */
    const authorIds = Array.isArray(book.authors)
      ? book.authors
          .map((entry) => entry?.author?.key)
          .filter((key) => typeof key === "string")
          .map((key) => key.replace("/authors/", ""))
      : [];

    /* --------------------------------------------------------------
       Шаг 3. Параллельно загружаем авторов.

       Promise.allSettled НЕ прерывает все запросы,
       если один из авторов не загрузился.
       -------------------------------------------------------------- */
    const authorResults =
      authorIds.length > 0
        ? await Promise.allSettled(
            authorIds.map((authorId) =>
              getAuthor(authorId)
            )
          )
        : [];

    /* --------------------------------------------------------------
       Шаг 4. Берём только успешные ответы.

       fulfilled — запрос выполнен успешно.
       rejected  — запрос завершился ошибкой.

       Ошибочные результаты просто пропускаем.
       -------------------------------------------------------------- */
    const authorNames = authorResults
      .filter(
        (result) =>
          result.status === "fulfilled"
      )
      .map((result) => result.value?.name)
      .filter(
        (name) =>
          typeof name === "string"
      );

    /* --------------------------------------------------------------
       Даже если один автор не загрузился,
       книга всё равно будет показана.
       -------------------------------------------------------------- */
    renderBook(book, authorNames);

    showState("content");
  } catch (error) {
    // Ошибка основного запроса книги критична.
    showState(
      "error",
      humanizeError(error)
    );
  }
}

/* ------------------------------------------------------------------
   Кнопка «Повторить».

   Повторно запускает загрузку той же книги.
   ------------------------------------------------------------------ */
if (retryBtn) {
  retryBtn.addEventListener(
    "click",
    loadBook
  );
}

/* ------------------------------------------------------------------
   Запускаем загрузку при открытии страницы.
   ------------------------------------------------------------------ */
loadBook();