/* ==========================================================================
   main.js — точка входа приложения BookNest.

   Здесь сходятся три вещи:
     1. state — единственный объект состояния всего приложения;
     2. render() — единственная функция, которая перерисовывает интерфейс;
     3. обработчики событий — реагируют на клики и ввод пользователя.

   ВАЖНО (для защиты): ровно один объект state и ровно одна функция render().
   Любое изменение в приложении — это изменение state, после которого
   вызывается render(). render() — основная функция отрисовки: она берёт
   текущий state и полностью обновляет карточки и счётчики.
   Отдельные вспомогательные функции (applyStateToForm, обработчики
   экспорта/импорта) тоже касаются DOM — например, чтобы синхронизировать
   поля формы с состоянием или создать временную ссылку для скачивания
   файла. Но вся отрисовка каталога централизована в render().
   ========================================================================== */

// Импортируем данные о книгах из модуля data/books.js.
// Импорт через ESM: путь указываем с расширением .js, потому что браузер
// не угадывает расширения, как это делает Node.js.
import { books } from "./data/books.js";

// Импортируем только те функции, которые реально используем в этом файле.
// GENRE_LABELS нужны в render.js, а countAvailable у нас нигде не вызывается —
// в renderBooks мы считаем количество отфильтрованных книг через length,
// поэтому отдельная функция countAvailable остаётся в lib/books.js
// как готовая утилита, но здесь не импортируется.
import {
  filterBooks,
  sortBooks,
  getBookById,
} from "./lib/books.js";

// Импортируем функции отрисовки из ui/render.js.
import {
  renderBooks,
  renderCounter,
  renderWishlistCount,
} from "./ui/render.js";

/* ------------------------------------------------------------------
   Получаем ссылки на элементы страницы.

   document.querySelector находит первый элемент по CSS-селектору.
   Все эти элементы должны быть в index.html — если какого-то нет,
   приложение упадёт с ошибкой в консоли. Поэтому HTML должен быть
   готов до подключения main.js — скрипт подключаем в конце body.
   ------------------------------------------------------------------ */
const listEl           = document.querySelector("#book-list");       // контейнер карточек
const counterEl        = document.querySelector("#counter");         // счётчик найденных
const wishlistCountEl  = document.querySelector("#wishlist-count");  // счётчик в шапке
const filterForm       = document.querySelector("#filters");         // форма фильтров
const searchInput      = document.querySelector("#search");          // поле поиска
const genreSelect      = document.querySelector("#genre");           // select жанров
const sortSelect       = document.querySelector("#sort");            // select сортировки
const availableCheck   = document.querySelector("#available");       // чекбокс «только доступные»
const resetButton      = document.querySelector("#reset");           // кнопка сброса
const exportButton     = document.querySelector("#export");          // кнопка экспорта JSON
const importInput      = document.querySelector("#import");          // input для импорта JSON

/* ------------------------------------------------------------------
   Состояние приложения.

   Единственный объект state — «источник правды». Всё, что видит
   пользователь, зависит от него. Если меняется state — вызываем render(),
   и интерфейс полностью перерисовывается.

   Поля:
     query         — что введено в поиск;
     genre         — выбранный жанр ("all" — все);
     sort          — ключ сортировки ("title" | "year" | "rating");
     onlyAvailable — включён ли чекбокс;
     wishlist      — Set с id книг, которые в списке желаемого.
                     Set выбран, потому что он быстро проверяет has(id)
                     и автоматически не хранит дубликаты.
   ------------------------------------------------------------------ */
const state = {
  query: "",
  genre: "all",
  sort: "title",
  onlyAvailable: false,
  wishlist: new Set(),
};

/* ------------------------------------------------------------------
   Ключи для localStorage. Вынес их в константы, чтобы не ошибиться
   в написании строки в разных местах.
   ------------------------------------------------------------------ */
const STORAGE_FILTERS_KEY  = "booknest:filters";
const STORAGE_WISHLIST_KEY = "booknest:wishlist";

/* ------------------------------------------------------------------
   readFiltersFromStorage — прочитать сохранённые фильтры.

   ВАЖНО (для защиты): чтение из localStorage обёрнуто в try/catch.
   Если в хранилище окажется мусор (например, пользователь вручную
   поломал данные), JSON.parse упадёт с ошибкой. Без try/catch
   приложение перестанет работать. С try/catch мы просто вернём
   пустой объект и продолжим со значениями по умолчанию.
   ------------------------------------------------------------------ */
function readFiltersFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_FILTERS_KEY);
    if (!raw) return {};                    // в хранилище пусто
    const parsed = JSON.parse(raw);
    // Проверяем, что это объект. Если массив или строка — не то, что нам надо.
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed;
  } catch (error) {
    // Если что-то пошло не так — не роняем приложение, а просто
    // сообщаем в консоль и возвращаем пустой объект.
    console.warn("Не удалось прочитать фильтры из localStorage:", error);
    return {};
  }
}

/* ------------------------------------------------------------------
   readWishlistFromStorage — прочитать сохранённый список желаемого.
   Логика та же: try/catch, проверка типа, значение по умолчанию.
   ------------------------------------------------------------------ */
function readWishlistFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Оставляем только числа — id книг. Если в массиве окажется
    // строка или объект, они не попадут в итог.
    return parsed.filter((id) => typeof id === "number");
  } catch (error) {
    console.warn("Не удалось прочитать список желаемого из localStorage:", error);
    return [];
  }
}

/* ------------------------------------------------------------------
   saveState — сохранить текущее состояние в localStorage.
   Сохраняем фильтры и список желаемого отдельно, чтобы можно было
   восстанавливать их независимо.
   ------------------------------------------------------------------ */
function saveState() {
  try {
    const filters = {
      query: state.query,
      genre: state.genre,
      sort: state.sort,
      onlyAvailable: state.onlyAvailable,
    };
    localStorage.setItem(STORAGE_FILTERS_KEY, JSON.stringify(filters));
    localStorage.setItem(
      STORAGE_WISHLIST_KEY,
      JSON.stringify([...state.wishlist])   // Set превращаем в обычный массив
    );
  } catch (error) {
    // Если места в хранилище не хватило или доступ запрещён — не роняем
    // приложение, просто пишем в консоль.
    console.warn("Не удалось сохранить состояние:", error);
  }
}

/* ------------------------------------------------------------------
   syncHashFromState — записать фильтры в адресную строку (location.hash).

   Доп. задание: синхронизация фильтров с URL, чтобы ссылку можно было
   переслать. Формат: #query=книга&genre=scifi&sort=year&available=1
   ------------------------------------------------------------------ */
function syncHashFromState() {
  const parts = [];
  if (state.query) parts.push(`query=${encodeURIComponent(state.query)}`);
  if (state.genre !== "all") parts.push(`genre=${state.genre}`);
  if (state.sort !== "title") parts.push(`sort=${state.sort}`);
  if (state.onlyAvailable) parts.push("available=1");

  // Если параметров нет — оставляем hash пустым. history.replaceState
  // не добавляет запись в историю браузера, то есть кнопка «назад»
  // работает нормально.
  const hash = parts.length > 0 ? "#" + parts.join("&") : "";
  history.replaceState(null, "", location.pathname + hash);
}

/* ------------------------------------------------------------------
   readStateFromHash — прочитать фильтры из адресной строки при загрузке.
   Если в URL есть параметры, применяем их к state. Это позволяет
   поделиться ссылкой на конкретный отфильтрованный вид.
   ------------------------------------------------------------------ */
function readStateFromHash() {
  // location.hash начинается с #. Убираем его и разбираем на пары ключ=значение.
  const raw = location.hash.slice(1);
  if (!raw) return;

  // URLSearchParams — встроенный класс, умеет разбирать строку запроса.
  const params = new URLSearchParams(raw);

  if (params.has("query"))     state.query = params.get("query");
  if (params.has("genre"))     state.genre = params.get("genre");
  if (params.has("sort"))      state.sort = params.get("sort");
  if (params.has("available")) state.onlyAvailable = params.get("available") === "1";
}

/* ------------------------------------------------------------------
   applyStateToForm — синхронизировать элементы формы с состоянием.

   Нужна после восстановления из localStorage или из URL: чтобы
   в полях появились сохранённые значения, а не пустота.
   ------------------------------------------------------------------ */
function applyStateToForm() {
  searchInput.value = state.query;
  genreSelect.value = state.genre;
  sortSelect.value = state.sort;
  availableCheck.checked = state.onlyAvailable;
}

/* ------------------------------------------------------------------
   render — ЕДИНСТВЕННАЯ функция, которая перерисовывает интерфейс.

   ВАЖНО (для защиты): никакой другой код не должен трогать DOM.
   Если что-то поменялось в состоянии — вызываем render(), и он
   целиком обновляет страницу: карточки, счётчики, заголовок.

   Шаги:
     1. Фильтруем книги по текущему состоянию.
     2. Сортируем результат.
     3. Отрисовываем карточки и счётчики.
   ------------------------------------------------------------------ */
function render() {
  // 1. Фильтр. filterBooks вернёт НОВЫЙ массив, исходный books не меняется.
  const filtered = filterBooks(books, {
    query: state.query,
    genre: state.genre,
    onlyAvailable: state.onlyAvailable,
  });

  // 2. Сортировка. sortBooks тоже вернёт НОВЫЙ массив.
  const sorted = sortBooks(filtered, state.sort);

  // 3. Отрисовка. Передаём Set со списком желаемого, чтобы renderBooks
  //    знал, у каких книг кнопка должна быть в состоянии «В списке».
  renderBooks(listEl, sorted, state.wishlist);
  renderCounter(counterEl, sorted.length);
  renderWishlistCount(wishlistCountEl, state.wishlist.size);

  // 4. Синхронизируем URL и сохраняем состояние.
  syncHashFromState();
  saveState();
}

/* ==================================================================
   ОБРАБОТЧИКИ СОБЫТИЙ.
   Все они либо меняют state, либо меняют localStorage — и потом
   вызывают render(). Больше ничего.
   ================================================================== */

/* ------------------------------------------------------------------
   Форма фильтров: поиск, жанр, сортировка, чекбокс.

   Используем событие input — оно срабатывает при каждом изменении
   любого поля. Это даёт «мгновенную реакцию» поиска, как в задании.

   ВАЖНО: event.preventDefault() нужен, чтобы браузер не пытался
   отправить форму и не перезагружал страницу. Без него «код не работает»
   — а на самом деле страница перезагружается и JS обнуляется.
   ------------------------------------------------------------------ */
filterForm.addEventListener("input", (event) => {
  event.preventDefault();                    // не даём форме отправиться

  // event.target — это тот элемент, в котором произошло событие.
  // Может быть input поиска, select жанра, select сортировки
  // или чекбокс. По id или name понимаем, что именно.
  const target = event.target;

  if (target === searchInput) {
    state.query = target.value;
  } else if (target === genreSelect) {
    state.genre = target.value;
  } else if (target === sortSelect) {
    state.sort = target.value;
  } else if (target === availableCheck) {
    state.onlyAvailable = target.checked;   // у чекбокса важно именно .checked
  }

  render();
});

// Не даём форме отправиться, если пользователь нажмёт Enter в поле поиска.
filterForm.addEventListener("submit", (event) => {
  event.preventDefault();
});

/* ------------------------------------------------------------------
   Делегирование кликов по карточкам.

   ВАЖНО (для защиты): на каждой карточке есть кнопка «Хочу прочитать»,
   но слушатель мы вешаем ОДИН — на контейнер #book-list. Почему:

   1. Слушатель на кнопке исчезнет при перерисовке (мы полностью
      перезаписываем innerHTML контейнера — все кнопки создаются заново).
   2. Если бы карточек было 40, это было бы 40 слушателей вместо одного.

   Внутри обработчика используем event.target.closest(".js-wish") —
   это ближайший родитель с классом js-wish. Метод работает от элемента,
   на котором произошёл клик, и поднимается вверх по дереву DOM.
   ------------------------------------------------------------------ */
listEl.addEventListener("click", (event) => {
  // Может быть debugger для отладки: раскомментируй строку ниже,
  // открой DevTools, кликни по кнопке — и посмотри event.target
  // и результат closest в панели Scope.
  // debugger;

  // event.target — элемент, по которому произошёл клик. У обычного
  // события click это всегда DOM-элемент (не текстовый узел), поэтому
  // если кликнули по кнопке, target — сама кнопка.
  // closest(".js-wish") ищет ближайший родительский элемент (или сам
  // target), подходящий под селектор. Это защищает нас от случаев,
  // когда кнопка содержит вложенные теги и клик пришёлся по ним:
  // closest всё равно поднимется до кнопки.
  const button = event.target.closest(".js-wish");

  // Если клик был не по кнопке «Хочу прочитать» — ничего не делаем.
  // Например, кликнули по заголовку карточки.
  if (!button) return;

  // Получаем id книги из data-атрибута. dataset.id — это доступ к
  // атрибуту data-id. Number() превращает строку в число.
  const id = Number(button.dataset.id);

  // Переключаем состояние в списке желаемого.
  if (state.wishlist.has(id)) {
    state.wishlist.delete(id);
  } else {
    state.wishlist.add(id);
  }

  // Перерисовываем интерфейс — кнопка изменит текст и aria-pressed.
  render();
});

/* ------------------------------------------------------------------
   Кнопка «Сбросить фильтры».
   Возвращает всё к начальному состоянию: пустой поиск, все жанры,
   сортировка по названию, чекбокс снят. Список желаемого НЕ трогаем —
   пользователь сбрасывает фильтры, а не свои книги.
   ------------------------------------------------------------------ */
resetButton.addEventListener("click", () => {
  state.query = "";
  state.genre = "all";
  state.sort = "title";
  state.onlyAvailable = false;

  applyStateToForm();   // обновляем поля формы — чтобы они тоже очистились
  render();
});

/* ------------------------------------------------------------------
   Экспорт списка желаемого в JSON-файл (доп. задание).

   Как это работает: берём массив id, превращаем в JSON-строку,
   создаём Blob (файл в памяти), генерируем ссылку на скачивание
   и кликаем по ней программно.
   ------------------------------------------------------------------ */
exportButton.addEventListener("click", () => {
  // Превращаем Set в массив чисел и сериализуем в JSON.
  const ids = [...state.wishlist];
  const json = JSON.stringify(ids, null, 2);

  // Blob — это «файл в памяти браузера». Тип application/json,
  // чтобы браузер понимал, что это JSON.
  const blob = new Blob([json], { type: "application/json" });

  // createObjectURL делает временную ссылку на этот файл.
  const url = URL.createObjectURL(blob);

  // Создаём невидимую ссылку, «кликаем» по ней и удаляем.
  const link = document.createElement("a");
  link.href = url;
  link.download = "booknest-wishlist.json";
  link.click();

  // Освобождаем память: ссылка больше не нужна.
  URL.revokeObjectURL(url);
});

/* ------------------------------------------------------------------
   Импорт списка желаемого из JSON-файла (доп. задание).

   Пользователь выбирает файл, читаем его как текст, парсим JSON,
   проверяем, что это массив чисел, и заменяем текущий список.
   Всё в try/catch, потому что файл может быть чем угодно.
   ------------------------------------------------------------------ */
importInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();          // читаем содержимое файла
    const parsed = JSON.parse(text);         // превращаем в объект

    if (!Array.isArray(parsed)) {
      throw new Error("Ожидался массив id");
    }

    // Фильтруем: оставляем только числа, которые есть среди наших книг.
    const validIds = parsed
      .filter((id) => typeof id === "number")
      .filter((id) => getBookById(books, id) !== undefined);

    state.wishlist = new Set(validIds);
    render();
  } catch (error) {
    // Если файл битый или не JSON — говорим об этом пользователю
    // и продолжаем работать со старым списком.
    console.warn("Не удалось импортировать список желаемого:", error);
    alert("Не удалось прочитать файл. Убедитесь, что это JSON со списком id.");
  }

  // Сбрасываем input, чтобы можно было импортировать тот же файл повторно.
  event.target.value = "";
});

/* ==================================================================
   СТАРТ ПРИЛОЖЕНИЯ.
   ================================================================== */

// 1. Пробуем восстановить список желаемого из localStorage.
state.wishlist = new Set(readWishlistFromStorage());

// 2. Читаем сохранённые фильтры из localStorage.
// Списки допустимых значений. Нужны, чтобы защититься от испорченного
// localStorage: если кто-то вручную подложит жанр "abracadabra",
// приложение не станет с ним работать, а просто проигнорирует.
const VALID_GENRES = ["all", "roman", "scifi", "detective", "fantasy", "nonfiction"];
const VALID_SORTS  = ["title", "year", "rating"];

const savedFilters = readFiltersFromStorage();

if (typeof savedFilters.query === "string") {
  state.query = savedFilters.query;
}

if (VALID_GENRES.includes(savedFilters.genre)) {
  state.genre = savedFilters.genre;
}

if (VALID_SORTS.includes(savedFilters.sort)) {
  state.sort = savedFilters.sort;
}

if (typeof savedFilters.onlyAvailable === "boolean") {
  state.onlyAvailable = savedFilters.onlyAvailable;
}

// 3. Читаем фильтры из URL. Если они там есть — они приоритетнее localStorage,
//    потому что пользователь явно перешёл по ссылке с параметрами.
readStateFromHash();

// 4. Применяем восстановленные значения к элементам формы, чтобы
//    поля выглядели как состояние (а не пустыми).
applyStateToForm();

// 5. Первый рендер.
render();