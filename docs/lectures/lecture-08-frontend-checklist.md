# Frontend самопроверка лекции 8

Точные формулировки взяты из frontend-групп раздела 20 силлабуса.
Цитаты «умею» описывают компетенции студента. Таблица оценивает код и проверки,
а не подтверждает, что студент лично выполнил действия без подсказки.
DONE отмечен [x] для реализации; PARTIAL/NOT_VERIFIED отмечены [ ].
Самостоятельная демонстрация всех компетенций пока NOT_VERIFIED.
AUTO означает локальный компонентный тест, STATIC - просмотр кода; эти методы не заменяют полный браузерный проход.

| Отметка | ID | Компетенция дословно | Статус и метод | Подтверждение и ограничение |
| --- | --- | --- | --- | --- |
| [x] | F01 | Объясняю путь запроса от ввода URL до отрисовки, называя все участвующие компоненты. | DONE / STATIC | docs/lectures/lecture-08.md. Путь браузер - React - API - PostgreSQL описан ниже. Самостоятельный устный ответ еще не проверялся. |
| [ ] | F02 | Читаю вкладку Network и по ней определяю причину сбоя. | NOT_VERIFIED / MANUAL | docs/improvements/STAGE17_USER_CHECKLIST.md. Новый проход DevTools Network не выполнялся; нужен пользовательский кадр при финальной приемке. |
| [ ] | F03 | Называю сценарий для каждого из кодов 200, 201, 204, 301, 400, 401, 403, 404, 409, 422, 500. | PARTIAL / STATIC | docs/api-design.md; app/core/http.py. Коды и примеры есть; самостоятельное чтение каждого ответа не проверялось в этом блоке. |
| [x] | F04 | Различаю статический сайт, SPA и SSR по наблюдаемому поведению. | DONE / STATIC | docs/lectures/lecture-08.md. BookNest определен как SPA со статической оболочкой и API; SSR в проекте не реализуется. |
| [x] | F05 | Выполняю запрос через  curl  с нужными заголовками и читаю ответ. | DONE / CURL | docs/lectures/lecture-08-validation.json. Публичный GET /health с Accept: application/json: первая попытка timeout, повтор 200/status=ok. Это не полная приемка сайта. |
| [ ] | F06 | Пишу валидный семантический HTML без ошибок валидатора. | PARTIAL / STATIC | react-app/src/shared/layout/AppLayout.tsx; react-app/src/features/books/components/BookForm.tsx. Есть main/nav/label/fieldset; новый полный HTML-валидатор не запускался. |
| [x] | F07 | Собираю форму с нативной валидацией и доступными сообщениями об ошибках. | DONE / STATIC_AUTO | react-app/src/pages/login/LoginPage.tsx; react-app/src/tests/BookForm.test.tsx. Вход использует нативные type/email/required; форма книги - noValidate/Zod и полевые сообщения. Механизмы различаются явно. |
| [ ] | F08 | Прохожу интерфейс с клавиатуры и устраняю недостижимые элементы. | PARTIAL / AUTO_MANUAL | react-app/src/tests/Accessibility.test.tsx; react-app/src/features/accessibility/RouteAccessibility.tsx. Тесты фокуса и уведомлений проходят; полный проход всех страниц клавиатурой еще нужен. |
| [ ] | F09 | Считаю специфичность селектора и предсказываю применяемое правило. | NOT_VERIFIED / MANUAL | react-app/src/App.css. Предсказание приоритета выбранных CSS-селекторов студентом не проверялось; lint/tsc этого не доказывают. |
| [ ] | F10 | Строю адаптивную раскладку на Flexbox и Grid по принципу mobile-first. | PARTIAL / STATIC_MANUAL | react-app/src/App.css; react-app/src/features/books/components/BookForm.css. Есть адаптивные правила; актуальный визуальный проход ширин и отсутствие горизонтального скролла не проверялись. |
| [x] | F11 | Поддерживаю тёмную тему через токены без дублирования стилей компонентов. | DONE / STATIC | react-app/src/app/ThemeProvider.tsx; react-app/src/App.css. Тема задается провайдером и CSS-переменными; новые кадры светлой/темной темы нужны отдельно. |
| [x] | F12 | Преобразую массив объектов цепочкой методов без мутации исходных данных. | DONE / STATIC_AUTO | react-app/src/pages/books/BooksPage.tsx; react-app/src/tests/Wishlist.test.tsx. Преобразования массива и восстановление списка выполняются без изменения исходного массива. |
| [ ] | F13 | Обрабатываю действия пользователя через делегирование событий. | PARTIAL / STATIC | react-app/src/components/BookList.tsx. React-обработчики не выдаются за самостоятельно написанный пример JS-делегирования. Показ старого JS-примера не выполнялся. |
| [x] | F14 | Пишу асинхронный код на  async/await  с обработкой ошибок. | DONE / AUTO | react-app/src/api/client.ts; react-app/src/tests/ApiClient.test.ts. Async/await и ветки отказа проверены существующим набором. |
| [x] | F15 | Отличаю сетевую ошибку от неуспешного кода HTTP и обрабатываю их по-разному. | DONE / AUTO | react-app/src/tests/ApiClient.test.ts; react-app/src/tests/BookFormApi.test.ts. Есть разбор HTTP-ошибок и сетевого отказа; клиент сохраняет понятное сообщение. |
| [x] | F16 | Реализую четыре состояния данных в интерфейсе и не допускаю «зависших» индикаторов. | DONE / AUTO | react-app/src/tests/CatalogSearch.test.tsx; react-app/src/tests/Discover.test.tsx. Состояния loading/empty/error/success и повторы покрыты компонентными сценариями. |
| [x] | F17 | Устраняю гонку запросов через отмену и debounce. | DONE / AUTO | react-app/src/features/books/hooks/useGlobalBooks.ts; react-app/src/tests/BookDetailsRace.test.tsx. Отмена и игнорирование поздних результатов проверяются тестами; debounce есть в shared/hooks. |
| [x] | F18 | Раскладываю макет на компоненты и обосновываю место хранения каждого фрагмента состояния. | DONE / STATIC | docs/lectures/lecture-08.md; react-app/src/pages/books/BooksPage.tsx. Размещение состояния и компонентов объяснено; обратные зависимости AppLayout отдельно отмечены как долг. |
| [x] | F19 | Обновляю состояние иммутабельно и объясняю, почему это обязательно. | DONE / AUTO | react-app/src/tests/Wishlist.test.tsx; react-app/src/pages/books/BooksPage.tsx. Оптимистичное изменение/откат и иммутабельные обновления проверены. |
| [x] | F20 | Использую  useEffect  с корректными зависимостями и функцией очистки. | DONE / AUTO | react-app/src/shared/hooks/useDebounce.ts; react-app/src/features/books/hooks/useGlobalBooks.ts. Очистка таймера и AbortController присутствуют; гонки покрыты тестами. |
| [x] | F21 | Выношу работу с сервером в собственный хук и слой API. | DONE / STATIC_AUTO | react-app/src/features/books/hooks/useGlobalBooks.ts; react-app/src/api/discover.ts. Собственный хук глобального поиска и отдельный сетевой адаптер уже существуют. |
| [x] | F22 | Настраиваю маршрутизацию с вложенными layout-маршрутами, параметрами и 404. | DONE / AUTO | react-app/src/tests/RoutingAcceptance.test.tsx; react-app/src/app/router/AppRouter.tsx. Проверены настоящий AppRouter, 404, переход назад, bookId и доступ к форме. |
| [x] | F23 | Реализую форму со схемной валидацией и отображением серверных ошибок на полях. | DONE / AUTO | react-app/src/tests/BookForm.test.tsx; react-app/src/tests/BookFormApi.test.ts. Схема, полевые ошибки, сохранение ввода и блокировка повторов проверены. |
| [x] | F24 | Типизирую props, состояние и ответы API без использования  any . | DONE / TSC_AST | react-app/tsconfig.app.json; docs/lectures/lecture-08-validation.json. tsc -b успешен; отдельный AST-проход 90 TS/TSX файлов обнаружил 0 AnyKeyword. expect.any не является типом any. |

## Что остается для ручной проверки

- DevTools Network: запрос, код, параметры и причина контролируемого отказа.
- Полный маршрут клавиатурой, нативная подсказка браузера и визуальная доступность.
- Ширины экранов, отсутствие переполнения, светлая/темная тема.
- Самостоятельное объяснение CSS-специфичности и делегирования событий.
- Прямые ссылки после перезагрузки на опубликованном сервере.
Подробные кадры будут объединены с финальным списком после остальных доработок. Сейчас переснимать весь сайт не требуется.

## Границы результата

Заполненный чек-лист приложен к PR этого блока. Непроверенные действия не выданы за успешные.
Практика 8 и исправление архитектурного долга выполняются отдельно в порядке этапов.
Публичный health=200 подтверждает только ответ процесса, а не авторизацию, БД или полный CRUD.
