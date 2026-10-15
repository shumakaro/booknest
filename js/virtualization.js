// Нахожу кнопки.
const normalButton = document.querySelector("#render-normal");
const virtualButton = document.querySelector("#render-virtual");

// Нахожу контейнеры для списков.
const normalList = document.querySelector("#normal-list");
const virtualWindow = document.querySelector("#virtual-window");
const virtualList = document.querySelector("#virtual-list");

// Нахожу элементы, куда выведу время.
const normalTime = document.querySelector("#normal-time");
const virtualTime = document.querySelector("#virtual-time");

// Создаю массив из 5000 тестовых книг.
const books = [];

// Заполняю массив.
for (let i = 1; i <= 5000; i++) {
  books.push({
    id: i,
    title: "Книга " + i,
    author: "Автор " + i
  });
}

// Высота одной строки книги.
const itemHeight = 70;

// Сколько элементов показываю дополнительно сверху и снизу.
const extraItems = 5;


/* ---------------------------------------------------------------
   Обычная отрисовка всех 5000 книг.
   --------------------------------------------------------------- */
normalButton.addEventListener("click", function () {

  // Очищаю список перед новым тестом.
  normalList.innerHTML = "";

  // Запоминаю время начала.
  const start = performance.now();

  // Создаю все 5000 элементов.
  books.forEach(function (book) {

    const item = document.createElement("li");

    item.className = "virtual-book";

    item.textContent =
      book.title + " — " + book.author;

    normalList.appendChild(item);
  });

  // Запоминаю время окончания.
  const end = performance.now();

  // Считаю разницу.
  const result = end - start;

  // Показываю результат.
  normalTime.textContent =
    "Время: " + result.toFixed(2) + " мс";
});


/* ---------------------------------------------------------------
   Виртуализированная отрисовка.
   Показываю только элементы, которые сейчас видны.
   --------------------------------------------------------------- */
virtualButton.addEventListener("click", function () {

  // Запоминаю время начала.
  const start = performance.now();

  // Высота контейнера как будто в нём есть все 5000 книг.
  virtualList.style.height =
    books.length * itemHeight + "px";

  // Рисую только видимые элементы.
  renderVisibleBooks();

  // Запоминаю время окончания.
  const end = performance.now();

  // Считаю время.
  const result = end - start;

  // Показываю результат.
  virtualTime.textContent =
    "Время: " + result.toFixed(2) + " мс";
});


/* ---------------------------------------------------------------
   Функция показывает только ту часть списка,
   которая сейчас находится в окне прокрутки.
   --------------------------------------------------------------- */
function renderVisibleBooks() {

  // Получаю, насколько пользователь прокрутил список.
  const scrollTop = virtualWindow.scrollTop;

  // Высота видимого окна.
  const windowHeight = virtualWindow.clientHeight;

  // Определяю первый видимый элемент.
  let startIndex =
    Math.floor(scrollTop / itemHeight) - extraItems;

  // Не позволяю индексу быть меньше нуля.
  if (startIndex < 0) {
    startIndex = 0;
  }

  // Определяю последний видимый элемент.
  let endIndex =
    Math.ceil(
      (scrollTop + windowHeight) / itemHeight
    ) + extraItems;

  // Не позволяю выйти за пределы массива.
  if (endIndex > books.length) {
    endIndex = books.length;
  }

  // Очищаю старые видимые элементы.
  virtualList.innerHTML = "";

  // Создаю только нужную часть списка.
  for (let i = startIndex; i < endIndex; i++) {

    const book = books[i];

    const item = document.createElement("div");

    item.className = "virtual-book";

    item.textContent =
      book.title + " — " + book.author;

    // Ставлю элемент на его реальное место внутри большого списка.
    item.style.position = "absolute";
    item.style.top = i * itemHeight + "px";
    item.style.left = "0";
    item.style.right = "0";

    virtualList.appendChild(item);
  }
}


/* ---------------------------------------------------------------
   При прокрутке виртуального списка
   заново показываю только видимые элементы.
   --------------------------------------------------------------- */
virtualWindow.addEventListener("scroll", function () {
  renderVisibleBooks();
});