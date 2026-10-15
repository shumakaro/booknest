/* ==========================================================================
   ui/render.js — отрисовка интерфейса.

   Этот модуль знает о DOM, но НЕ знает о данных и правилах фильтрации.
   Его задача: получить готовый массив книг и показать его на странице.
   Всё, что связано с логикой (поиск, фильтр, сортировка), живёт в lib/books.js.

   ВАЖНО (для защиты): интерфейс — это функция состояния. То есть
   единственное, что делает этот модуль — берёт текущее состояние
   и полностью перерисовывает то, что нужно. Никаких «точечных правок» —
   если что-то поменялось, вызываем render() и он всё перерисовывает заново.
   ========================================================================== */

// Импортируем словарь жанров из lib/books.js. Нужен, чтобы подписать
// жанр по-русски в карточке: в данных жанр лежит как "scifi", а показать
// надо «Фантастика».
import { GENRE_LABELS } from "../lib/books.js";

/* ------------------------------------------------------------------
   renderBooks — отрисовать список карточек в контейнере.

   Принимает:
     container — DOM-элемент, куда вставлять карточки (например, <ul>);
     books     — массив книг, который нужно показать;
     wishlist  — Set с id книг, которые пользователь добавил в список желаемого.

   Ничего не возвращает, только меняет содержимое container.
   ------------------------------------------------------------------ */
// Отрисовываю книги и дополнительно получаю поисковый запрос.
export function renderBooks(container, books, wishlist, query = "") {
  // Если книг нет — показываем пустое состояние с подсказкой
  // и выходим из функции. Это требование задания: «корректное пустое
  // состояние с подсказкой».
  if (books.length === 0) {
    container.innerHTML = ""; // очищаем контейнер
    const empty = document.createElement("p");
    empty.className = "catalog__empty";
    empty.textContent = "Ничего не найдено. Попробуйте изменить фильтры.";
    container.appendChild(empty);
    return;
  }

  // Собираем карточки в массив строк. Используем map, чтобы не писать
  // цикл for вручную. Потом склеим через join("") и один раз вставим
  // в container — это быстрее и безопаснее, чем innerHTML += в цикле.
  const html = books
    .map((book) => {
      // Проверяем, в списке желаемого ли эта книга.
      // wishlist — это Set, у него есть метод has(id).
      const inWishlist = wishlist.has(book.id);

      // Класс для метки «доступно / нет экземпляров».
      const availabilityClass = book.available
        ? "book-card__available book-card__available--yes"
        : "book-card__available book-card__available--no";

      // Текст метки доступности.
      const availabilityText = book.available
        ? "Доступно"
        : "Нет свободных экземпляров";

      // Текст и aria-pressed для кнопки «Хочу прочитать».
      // aria-pressed — атрибут доступности, он говорит скринридеру,
      // что кнопка сейчас нажата.
      const buttonText = inWishlist ? "В списке" : "Хочу прочитать";
      const pressed = inWishlist ? "true" : "false";

      // Формируем разметку карточки. Здесь вставляем только те данные,
      // которые не приходят от пользователя: id, год, рейтинг, жанр.
      // Название и автор тоже наши — они из data/books.js, пользователь
      // их не редактирует. Всё это безопасно для innerHTML.
      // Если бы мы вставляли поисковый запрос пользователя, то обязаны
      // были бы использовать textContent, иначе можно получить XSS-атаку.
      return `
        <li class="book-card" data-id="${book.id}">
          <h3 class="book-card__title">${book.title}</h3>
          <p class="book-card__meta">Автор: ${book.author}</p>
          <p class="book-card__meta">Жанр: ${GENRE_LABELS[book.genre] ?? book.genre}</p>
          <p class="book-card__meta">Год: ${book.year}</p>
          <p class="book-card__meta">Рейтинг: ${book.rating.toFixed(1)}</p>
          <p class="${availabilityClass}">${availabilityText}</p>
          <button
            type="button"
            class="book-card__wish js-wish"
            data-id="${book.id}"
            aria-pressed="${pressed}"
          >${buttonText}</button>
        </li>
      `;
    })
    .join("");

  // Один раз вставляем все карточки. innerHTML полностью перезаписывает
  // содержимое контейнера — это то, что нам нужно, потому что при
  // каждом изменении состояния мы перерисовываем список с нуля.
  container.innerHTML = html;

  // Если пользователь ничего не искал,
// подсветку делать не нужно.
if (!query.trim()) {
  return;
}

// Получаю все карточки, которые только что были созданы.
const cards = container.querySelectorAll(".book-card");

// Перебираю каждую карточку.
cards.forEach((card) => {

  // Получаю id книги из data-id.
  const id = Number(card.dataset.id);

  // Нахожу книгу с таким id в массиве books.
  const book = books.find((item) => item.id === id);

  // Если книга не найдена, пропускаю эту карточку.
  if (!book) {
    return;
  }

  // Нахожу заголовок книги.
  const title = card.querySelector(".book-card__title");

  // Нахожу все строки с дополнительной информацией.
  const meta = card.querySelectorAll(".book-card__meta");

  // Первая строка meta содержит автора.
  const author = meta[0];

  // Подсвечиваю совпадение в названии.
  highlightText(title, book.title, query);

  // Подсвечиваю совпадение в имени автора.
  highlightText(author, "Автор: " + book.author, query);
});
}

/* ------------------------------------------------------------------
   renderCounter — обновить счётчик найденных книг.

   Принимает:
     element — DOM-элемент, куда писать текст (например, <p> или <span>);
     count   — число найденных книг.
   ------------------------------------------------------------------ */
export function renderCounter(element, count) {
  // Формируем текст со склонением: 1 книга, 2 книги, 5 книг.
  // Это мелочь, но выглядит аккуратно.
  const word = pluralize(count, "книга", "книги", "книг");
  element.textContent = `Найдено: ${count} ${word}`;
}

/* ------------------------------------------------------------------
   renderWishlistCount — обновить счётчик в шапке («Мой список: N»).

   Принимает:
     element — DOM-элемент счётчика в шапке;
     count   — сколько книг в списке желаемого.
   ------------------------------------------------------------------ */
export function renderWishlistCount(element, count) {
  // Если элемента нет на странице — ничего не делаем.
  // Так функция безопасна для любой страницы: например, profile.html
  // может не содержать счётчик в шапке.
  if (!element) return;
  element.textContent = `Мой список: ${count}`;
}

/* ------------------------------------------------------------------
   renderWishlistPage — отрисовать полный список желаемого на странице профиля.

   Принимает:
     container — DOM-элемент, куда вставлять карточки (наш #wishlist-list);
     books     — массив ВСЕХ книг (нам нужны данные: название, автор);
     wishlist  — Set с id книг в списке желаемого.

   Используется на profile.html: показывает не только те книги,
   что пользователь отметил, но и даёт кнопку «Удалить» рядом с каждой.

   ВАЖНО: если список пуст, показываем подсказку «вы ещё ничего
   не добавили». Это то же пустое состояние, что и в каталоге,
   только с другим текстом.
   ------------------------------------------------------------------ */
export function renderWishlistPage(container, books, wishlist) {
  // Оставляем только те книги, id которых есть в списке желаемого.
  // filter не мутирует исходный массив books.
  const wishlistBooks = books.filter((book) => wishlist.has(book.id));

  // Пустое состояние.
  if (wishlistBooks.length === 0) {
    container.innerHTML = "";
    const empty = document.createElement("p");
    empty.className = "wishlist__empty";
    empty.textContent = "В вашем списке пока нет книг. Добавьте их из каталога.";
    container.appendChild(empty);
    return;
  }

  // Собираем разметку для каждой книги.
  // Кнопка «Удалить» получает тот же класс js-wish, что и в каталоге,
  // чтобы обрабатывать клики через тот же делегированный обработчик
  // в main.js.
  const html = wishlistBooks
    .map((book) => `
      <li class="wishlist__item" data-id="${book.id}">
        <div class="wishlist__info">
          <h3 class="wishlist__title">${book.title}</h3>
          <p class="wishlist__meta">Автор: ${book.author}</p>
          <p class="wishlist__meta">Год: ${book.year}</p>
        </div>
        <button
          type="button"
          class="btn btn--ghost js-wish"
          data-id="${book.id}"
          aria-label="Удалить книгу ${book.title} из списка"
        >Удалить</button>
      </li>
    `)
    .join("");

  container.innerHTML = html;
}

/* ------------------------------------------------------------------
   pluralize — вспомогательная функция для правильной формы слова.

   Русский язык — сложный для склонений. Здесь простое правило:
   числа, оканчивающиеся на 1 (кроме 11) — первая форма;
   оканчивающиеся на 2, 3, 4 (кроме 12, 13, 14) — вторая;
   остальные — третья.
   ------------------------------------------------------------------ */
function pluralize(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few;
  }
  return many;
}

/* ------------------------------------------------------------------
   highlightText — подсветка найденной части текста.

   Здесь не используется innerHTML.
   Все части текста создаются через textContent.
   Поэтому пользовательский поисковый запрос
   не может вставить HTML-код на страницу.
   ------------------------------------------------------------------ */
function highlightText(element, text, query) {

  // Очищаю старое содержимое элемента.
  element.textContent = "";

  // Убираю пробелы у поискового запроса.
  const search = query.trim();

  // Если запрос пустой, просто возвращаю обычный текст.
  if (!search) {
    element.textContent = text;
    return;
  }

  // Перевожу текст и запрос в нижний регистр,
  // чтобы поиск не зависел от регистра.
  const lowerText = text.toLowerCase();
  const lowerSearch = search.toLowerCase();

  // Ищу позицию совпадения.
  const position = lowerText.indexOf(lowerSearch);

  // Если совпадения нет, показываю обычный текст.
  if (position === -1) {
    element.textContent = text;
    return;
  }

  // Получаю текст до совпадения.
  const before = text.slice(0, position);

  // Получаю сам найденный фрагмент.
  const match = text.slice(
    position,
    position + search.length
  );

  // Получаю текст после совпадения.
  const after = text.slice(
    position + search.length
  );

  // Добавляю обычный текст до совпадения.
  element.append(
    document.createTextNode(before)
  );

  // Создаю тег mark для найденной части.
  const mark = document.createElement("mark");

  // Записываю найденный текст безопасно через textContent.
  mark.textContent = match;

  // Добавляю подсвеченный фрагмент.
  element.append(mark);

  // Добавляю оставшийся текст.
  element.append(
    document.createTextNode(after)
  );
}