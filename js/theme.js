// Нахожу кнопку переключения темы по её id.
const themeButton = document.querySelector("#theme-toggle");

// Получаю сохранённую тему из localStorage.
const savedTheme = localStorage.getItem("theme");

// Проверяю, была ли тема сохранена раньше.
if (savedTheme === "light" || savedTheme === "dark") {

  // Если была, записываю её в атрибут data-theme у тега html.
  document.documentElement.setAttribute("data-theme", savedTheme);
}

// Проверяю, что кнопка действительно есть на странице.
if (themeButton) {

  // Добавляю действие при нажатии на кнопку.
  themeButton.addEventListener("click", function () {

    // Получаю тему, которая сейчас выбрана вручную.
    let currentTheme =
      document.documentElement.getAttribute("data-theme");

    // Если data-theme ещё нет,
    // значит сайт сейчас использует тему компьютера.
    if (!currentTheme) {

      // Проверяю, включена ли на компьютере тёмная тема.
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {

        // Если да, считаю текущую тему тёмной.
        currentTheme = "dark";

      } else {

        // Иначе считаю текущую тему светлой.
        currentTheme = "light";
      }
    }

    // Если сейчас тёмная тема...
    if (currentTheme === "dark") {

      // ...переключаю её на светлую.
      document.documentElement.setAttribute("data-theme", "light");

      // Сохраняю светлую тему в localStorage.
      localStorage.setItem("theme", "light");

    } else {

      // Иначе включаю тёмную тему.
      document.documentElement.setAttribute("data-theme", "dark");

      // Сохраняю тёмную тему в localStorage.
      localStorage.setItem("theme", "dark");
    }
  });
}