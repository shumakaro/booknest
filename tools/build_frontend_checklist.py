"""Самопроверка реализации по точным формулировкам раздела 20 силлабуса."""

import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
raw = (ROOT / "docs/course/syllabus-full.txt").read_text(encoding="utf-8-sig").splitlines()
start = next(i for i, line in enumerate(raw) if re.match(r"\s*20\s+Итоговый checklist", line))
groups = {"Основы веба", "Разметка и стили", "JavaScript и асинхронность", "React"}
criteria = []
group = None
for index in range(start + 1, len(raw)):
    value = raw[index].strip()
    if value == "Backend":
        break
    if value in groups:
        group = value
    elif value and group:
        criteria.append({"group": group, "text": value, "source_line": index + 1})
assert len(criteria) == 24
DATA = [
    ("DONE", "STATIC", ["docs/lectures/lecture-08.md"], "Путь браузер - React - API - PostgreSQL описан ниже. Самостоятельный устный ответ еще не проверялся."),
    ("NOT_VERIFIED", "MANUAL", ["docs/improvements/STAGE17_USER_CHECKLIST.md"], "Новый проход DevTools Network не выполнялся; нужен пользовательский кадр при финальной приемке."),
    ("PARTIAL", "STATIC", ["docs/api-design.md", "app/core/http.py"], "Коды и примеры есть; самостоятельное чтение каждого ответа не проверялось в этом блоке."),
    ("DONE", "STATIC", ["docs/lectures/lecture-08.md"], "BookNest определен как SPA со статической оболочкой и API; SSR в проекте не реализуется."),
    ("DONE", "CURL", ["docs/lectures/lecture-08-validation.json"], "Публичный GET /health с Accept: application/json: первая попытка timeout, повтор 200/status=ok. Это не полная приемка сайта."),
    ("PARTIAL", "STATIC", ["react-app/src/shared/layout/AppLayout.tsx", "react-app/src/features/books/components/BookForm.tsx"], "Есть main/nav/label/fieldset; новый полный HTML-валидатор не запускался."),
    ("DONE", "STATIC_AUTO", ["react-app/src/pages/login/LoginPage.tsx", "react-app/src/tests/BookForm.test.tsx"], "Вход использует нативные type/email/required; форма книги - noValidate/Zod и полевые сообщения. Механизмы различаются явно."),
    ("PARTIAL", "AUTO_MANUAL", ["react-app/src/tests/Accessibility.test.tsx", "react-app/src/features/accessibility/RouteAccessibility.tsx"], "Тесты фокуса и уведомлений проходят; полный проход всех страниц клавиатурой еще нужен."),
    ("NOT_VERIFIED", "MANUAL", ["react-app/src/App.css"], "Предсказание приоритета выбранных CSS-селекторов студентом не проверялось; lint/tsc этого не доказывают."),
    ("PARTIAL", "STATIC_MANUAL", ["react-app/src/App.css", "react-app/src/features/books/components/BookForm.css"], "Есть адаптивные правила; актуальный визуальный проход ширин и отсутствие горизонтального скролла не проверялись."),
    ("DONE", "STATIC", ["react-app/src/app/ThemeProvider.tsx", "react-app/src/App.css"], "Тема задается провайдером и CSS-переменными; новые кадры светлой/темной темы нужны отдельно."),
    ("DONE", "STATIC_AUTO", ["react-app/src/pages/books/BooksPage.tsx", "react-app/src/tests/Wishlist.test.tsx"], "Преобразования массива и восстановление списка выполняются без изменения исходного массива."),
    ("PARTIAL", "STATIC", ["react-app/src/components/BookList.tsx"], "React-обработчики не выдаются за самостоятельно написанный пример JS-делегирования. Показ старого JS-примера не выполнялся."),
    ("DONE", "AUTO", ["react-app/src/api/client.ts", "react-app/src/tests/ApiClient.test.ts"], "Async/await и ветки отказа проверены существующим набором."),
    ("DONE", "AUTO", ["react-app/src/tests/ApiClient.test.ts", "react-app/src/tests/BookFormApi.test.ts"], "Есть разбор HTTP-ошибок и сетевого отказа; клиент сохраняет понятное сообщение."),
    ("DONE", "AUTO", ["react-app/src/tests/CatalogSearch.test.tsx", "react-app/src/tests/Discover.test.tsx"], "Состояния loading/empty/error/success и повторы покрыты компонентными сценариями."),
    ("DONE", "AUTO", ["react-app/src/features/books/hooks/useGlobalBooks.ts", "react-app/src/tests/BookDetailsRace.test.tsx"], "Отмена и игнорирование поздних результатов проверяются тестами; debounce есть в shared/hooks."),
    ("DONE", "STATIC", ["docs/lectures/lecture-08.md", "react-app/src/pages/books/BooksPage.tsx"], "Размещение состояния и компонентов объяснено; обратные зависимости AppLayout отдельно отмечены как долг."),
    ("DONE", "AUTO", ["react-app/src/tests/Wishlist.test.tsx", "react-app/src/pages/books/BooksPage.tsx"], "Оптимистичное изменение/откат и иммутабельные обновления проверены."),
    ("DONE", "AUTO", ["react-app/src/shared/hooks/useDebounce.ts", "react-app/src/features/books/hooks/useGlobalBooks.ts"], "Очистка таймера и AbortController присутствуют; гонки покрыты тестами."),
    ("DONE", "STATIC_AUTO", ["react-app/src/features/books/hooks/useGlobalBooks.ts", "react-app/src/api/discover.ts"], "Собственный хук глобального поиска и отдельный сетевой адаптер уже существуют."),
    ("DONE", "AUTO", ["react-app/src/tests/RoutingAcceptance.test.tsx", "react-app/src/app/router/AppRouter.tsx"], "Проверены настоящий AppRouter, 404, переход назад, bookId и доступ к форме."),
    ("DONE", "AUTO", ["react-app/src/tests/BookForm.test.tsx", "react-app/src/tests/BookFormApi.test.ts"], "Схема, полевые ошибки, сохранение ввода и блокировка повторов проверены."),
    ("DONE", "TSC_AST", ["react-app/tsconfig.app.json", "docs/lectures/lecture-08-validation.json"], "tsc -b успешен; отдельный AST-проход 90 TS/TSX файлов обнаружил 0 AnyKeyword. expect.any не является типом any."),
]
records = []
for index, (criterion, detail) in enumerate(zip(criteria, DATA, strict=True), 1):
    status, method, files, note = detail
    assert all((ROOT / file).is_file() for file in files), files
    records.append({"id": f"F{index:02}", **criterion, "status": status, "method": method,
                    "files": files, "note": note, "student_demonstration": "NOT_VERIFIED"})
out = ROOT / "docs/lectures"
(out / "lecture-08-frontend-checklist.json").write_text(
    json.dumps({"source": "Силлабус раздел 20", "date": "2026-11-14", "items": records}, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
md = ["# Frontend самопроверка лекции 8", "",
      "Точные формулировки взяты из frontend-групп раздела 20 силлабуса.",
      "Цитаты «умею» описывают компетенции студента. Таблица оценивает код и проверки,",
      "а не подтверждает, что студент лично выполнил действия без подсказки.",
      "DONE отмечен [x] для реализации; PARTIAL/NOT_VERIFIED отмечены [ ].",
      "Самостоятельная демонстрация всех компетенций пока NOT_VERIFIED.",
      "AUTO означает локальный компонентный тест, STATIC - просмотр кода; эти методы не заменяют полный браузерный проход.",
      "", "| Отметка | ID | Компетенция дословно | Статус и метод | Подтверждение и ограничение |",
      "| --- | --- | --- | --- | --- |"]
for r in records:
    text = r["text"].replace("|", r"\|").replace("<", "&lt;").replace(">", "&gt;")
    refs = "; ".join(r["files"])
    md.append(f"| {'[x]' if r['status']=='DONE' else '[ ]'} | {r['id']} | {text} | {r['status']} / {r['method']} | {refs}. {r['note']} |")
md += ["", "## Что остается для ручной проверки", "",
       "- DevTools Network: запрос, код, параметры и причина контролируемого отказа.",
       "- Полный маршрут клавиатурой, нативная подсказка браузера и визуальная доступность.",
       "- Ширины экранов, отсутствие переполнения, светлая/темная тема.",
       "- Самостоятельное объяснение CSS-специфичности и делегирования событий.",
       "- Прямые ссылки после перезагрузки на опубликованном сервере.",
       "Подробные кадры будут объединены с финальным списком после остальных доработок. Сейчас переснимать весь сайт не требуется.",
       "", "## Границы результата", "",
       "Заполненный чек-лист приложен к PR этого блока. Непроверенные действия не выданы за успешные.",
       "Практика 8 и исправление архитектурного долга выполняются отдельно в порядке этапов.",
       "Публичный health=200 подтверждает только ответ процесса, а не авторизацию, БД или полный CRUD."]
(out / "lecture-08-frontend-checklist.md").write_text("\n".join(md).rstrip() + "\n", encoding="utf-8")
print(json.dumps({"criteria": len(records), "done": sum(r["status"] == "DONE" for r in records),
                  "partial": sum(r["status"] == "PARTIAL" for r in records),
                  "not_verified": sum(r["status"] == "NOT_VERIFIED" for r in records)}, ensure_ascii=False))
