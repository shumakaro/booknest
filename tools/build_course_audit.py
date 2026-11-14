"""Матрица аудита: источник отделен от оценки, исторические проверки от новых."""

from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
ODT = ROOT / "docs/course/odt"
AUDIT = ROOT / "docs/audit"
CI = "docs/audit/final-ci-20261114.json"
ROUTES = "react-app/src/app/router/AppRouter.tsx"
FORM = "react-app/src/features/books/components/BookForm.tsx"
SCHEMA = "react-app/src/features/books/bookSchema.ts"
AUTH = "app/core/auth.py"
SQL = "docs/lab8/sql-results.txt"
ORM = "docs/lab8/migrations-results.txt"
ALL_SECTIONS = {
    "Learning objectives", "Основные понятия", "План лекции", "Теоретический материал",
    "Практические примеры", "Code examples", "Демонстрация на занятии",
    "Типичные ошибки студентов", "Контрольные вопросы", "Домашнее задание", "Материалы",
    "Цель", "Исходные знания", "ПО", "Пошаговое задание", "Пример",
    "Самостоятельная часть", "Challenge task", "Результат и критерии",
}
rows: list[dict] = []
inventory: list[dict] = []
EXAMPLES = {
    8: [(27, 74), (75, 133), (134, 152)],
    9: [(210, 258), (259, 313), (314, 346)],
    10: [(404, 470), (471, 503), (504, 521)],
    11: [(579, 628), (629, 677), (678, 713), (714, 726)],
    12: [(785, 815), (816, 886), (887, 927)],
    13: [(989, 1011), (1012, 1066), (1067, 1145), (1146, 1166)],
    14: [(1225, 1245), (1246, 1259), (1260, 1311), (1312, 1343), (1344, 1363), (1364, 1398)],
    15: [(1458, 1471), (1472, 1483)],
}


def evidence(status: str, files: list[str], check: str, note: str = "") -> tuple:
    return status, files, check, note


# Номера здесь являются номерами абзацев исходного ODT, а не придуманными
# номерами заданий. Собственная нумерация списков извлекается отдельно.
PRACTICE = {
    10: evidence("DONE", [ROUTES, "react-app/src/shared/layout/AppLayout.tsx", CI], "Статическая сверка маршрутов; сохраненный CI проверяет SPA."),
    11: evidence("MISSING", [SCHEMA, "app/schemas/__init__.py"], "Найдена схема книги и серверная схема выдачи.", "Клиентская схема выдачи с e-mail, положительным bookId и двумя датами не найдена. Схема книги не считается ее заменой."),
    12: evidence("MISSING", [SCHEMA], "Проверено содержимое клиентской схемы.", "Проверка двух годов книги не является правилом dueDate > issuedAt формы выдачи."),
    13: evidence("PARTIAL", [SCHEMA], "Есть z.infer для BookFormValues.", "Тип формы выдачи не найден; прием выводимого типа реализован на другой форме."),
    14: evidence("PARTIAL", [FORM], "Есть useForm, zodResolver, aria-describedby и role=alert.", "Явный mode onBlur не задан; формы выдачи нет."),
    15: evidence("PARTIAL", [FORM, "react-app/src/tests/BookForm.test.tsx"], "Кнопка формы книги блокируется, есть lock и проверка повторной отправки.", "Требуемая форма выдачи отсутствует; для нее отдельно нужны состояния."),
    16: evidence("PARTIAL", ["react-app/src/api/bookForm.ts", FORM, "react-app/src/tests/BookFormApi.test.ts"], "Серверные ошибки книги отображаются на полях.", "Для выдачи 409 должен быть связан с выбором книги; отдельная заглушка detail и форма не найдены."),
    17: evidence("DONE", ["react-app/src/pages/books/BookFormPage.tsx"], "onSuccess выполняет переход к сохраненной книге."),
    18: evidence("DONE", ["react-app/src/pages/books/BooksPage.tsx", "react-app/src/features/books/catalogFilters.ts", CI], "Фильтры и страница читаются из URL; существующие проверки каталога сохранены."),
    23: evidence("DONE", [FORM, "react-app/src/pages/books/BookFormPage.tsx"], "Один компонент, два режима, предзаполнение через defaultValues."),
    25: evidence("PARTIAL", ["react-app/src/shared/hooks/useUnsavedChanges.ts", FORM], "isDirty включает beforeunload и перехват клика ссылки.", "Внутри используется globalThis.confirm. Нет полного блокирования history/back и программной навигации с собственным диалогом."),
    37: evidence("DONE", ["docs/api-design.md"], "Есть сущности, методы, пути, роли и коды. Бумажная работа не выдается за новый артефакт."),
    38: evidence("EXCLUDED_PEER_TASK", [], "Взаимная проверка исключена пользователем."),
    39: evidence("DONE", ["requirements.txt", "app/main.py", "app/legacy.py", "docs/lab7/report.md"], "Окружение и структура существуют; запуск описан в сохраненном отчете."),
    40: evidence("DONE", ["app/schemas/__init__.py"], "BookCreate, BookUpdate, BookRead и Field присутствуют."),
    41: evidence("DONE", ["app/routers/catalog.py", "app/repositories/memory.py", "docs/lab7/report.md"], "Исторический API в памяти сохранен отдельно; текущий API закономерно использует БД."),
    42: evidence("PARTIAL", ["docs/lab7/swagger.png", "docs/lab7/api.http", "docs/lab7/report.md"], "Есть исходный кадр Swagger и сценарии кодов.", "Визуальная приемка всех трех операций на текущем API отдельно не выполнялась."),
    43: evidence("DONE", ["app/main.py", "app/config.py"], "/health и метаданные FastAPI присутствуют."),
    44: evidence("DONE", ["docs/lab7/openapi.json", "docs/lab12/openapi.json"], "Экспорты OpenAPI сохранены; история версий не смешивается."),
    50: evidence("DONE", ["app/routers/catalog.py", "app/routers/catalog_db.py", "tests/test_catalog.py", CI], "GET/PATCH/DELETE, exclude_unset, 204 и отсутствие ресурса покрыты сохраненными тестами."),
    52: evidence("DONE", ["app/core/pagination.py", "app/schemas/__init__.py", "app/routers/catalog_db.py"], "Pagination используется в списках книг и авторов; Page Generic содержит четыре поля."),
    64: evidence("MISSING", ["docs/course/odt/lecture-10.txt"], "В лекции есть описание широкой таблицы.", "Отдельного анализа трех аномалий с конкретными строками исходной таблицы не найдено. Может быть подготовлен на примере из лекции без выдумывания выдачи преподавателем файла."),
    65: evidence("PARTIAL", ["db/er.mmd", "db/er.png", "db/README.md"], "Диаграмма и схема нормализованы; PNG существует.", "Не найден отдельный разбор перехода от широкой таблицы к 1NF/2NF/3NF; инструмент аналог допустим для лекционного задания."),
    66: evidence("DONE", ["db/schema.sql", "db/README.md", SQL], "7 исходных таблиц, три типа связей, ключи, CHECK и ON DELETE."),
    67: evidence("DONE", ["db/seed.sql", SQL], "Историческое наполнение: 30 книг и связанные записи; повторный seed не выполнялся."),
    68: evidence("DONE", [SQL], "Сохранены реальные ошибки 23514, 23503, 23505."),
    69: evidence("DONE", ["db/queries.sql", SQL], "12 SQL-запросов включают соединения, группировку, HAVING, LEFT JOIN, пагинацию и вычисления."),
    70: evidence("DONE", ["tools/check_sql.py", SQL], "Протокол ROLLBACK verified: both operations cancelled."),
    76: evidence("DONE", ["db/queries.sql", SQL], "Каталог с автором, жанрами и доступностью описан одним SQL-запросом."),
    78: evidence("PARTIAL", ["db/benchmark.sql", SQL, "db/schema.sql"], "Исторический стенд 500000 строк, планы до/после и частичный уникальный индекс есть.", "Измерен отдельный benchmark_books, а не полный запрос главного экрана с его связями."),
    90: evidence("DONE", ["app/models.py"], "Модели и двусторонние relationship, secondary для M:N присутствуют."),
    91: evidence("DONE", ["app/db.py", "app/config.py", "docs/lab8/n-plus-one-before.log"], "echo настраивается окружением; SQL-логи сохранены, get_db создает сессию на запрос."),
    92: evidence("PARTIAL", ["migrations/env.py", "migrations/versions/001_schema.py", "docs/lab8/orm-sql-comparison.md", ORM], "Alembic и первая ревизия есть, цикл воспроизведения подтвержден.", "Файл orm-sql-comparison сравнивает один запрос. Полной таблицы сравнения типов, ключей и ограничений исходного DDL и соответствующей исторической ORM-схемы не найдено."),
    93: evidence("DONE", ["tools/compare_sql.py", "docs/lab8/orm-sql-comparison.md"], "Рукописный SQL и скомпилированный select сопоставлены."),
    94: evidence("DONE", ["docs/lab8/n-plus-one-before.log"], "Исторический сценарий: 26 SELECT."),
    95: evidence("DONE", ["docs/lab8/n-plus-one-after.log", "app/repositories/catalog.py"], "Тот же исторический сценарий: 3 SELECT; используется selectinload."),
    96: evidence("DONE", ["migrations/versions/002_profile_names.py", ORM], "Исторически выполнены upgrade, downgrade и повторный upgrade с проверкой данных."),
    97: evidence("DONE", ["app/repositories/catalog.py", "app/services/catalog.py", CI], "Репозиторий CRUD и серверная пагинация, сохраненный CI."),
    102: evidence("DONE", ["app/routers/catalog_db.py", "docs/api-design.md", CI], "Контракт каталога сохранен при переносе на PostgreSQL; новые права являются последующим этапом."),
    104: evidence("DONE", ["migrations/versions/002_profile_names.py", ORM], "Разделение и обратное склеивание имен, включая повторные и конечные пробелы, проверены историческим протоколом."),
    116: evidence("BLOCKED", ["docs/security-review.md"], "Наличие преподавательского vuln-lab не подтверждено.", "Защита React в BookNest не доказывает воспроизведение и закрытие XSS на исходном учебном стенде."),
    117: evidence("BLOCKED", ["app/repositories/catalog.py", "docs/security-review.md"], "Параметризация BookNest есть.", "Нет предоставленного vuln-lab и его реального протокола до/после SQL-инъекции."),
    118: evidence("PARTIAL", ["tests/test_auth.py", "app/core/security.py", CI], "Тест поврежденного JWT есть; действующий токен не отправлялся на сторонний сайт.", "Исходный учебный стенд и отдельный визуальный разбор не подтверждены. Допустим только учебный токен."),
    119: evidence("PARTIAL", [AUTH, "tests/test_auth.py", CI], "BookNest отклоняет доступ к чужой выдаче 404.", "Воспроизведение намеренно уязвимой версии преподавательского стенда не подтверждено."),
    120: evidence("DONE", ["app/core/security.py", "app/services/auth.py", "tests/test_auth.py", CI], "bcrypt, регистрация, вход и одинаковые отказы покрыты тестами."),
    121: evidence("PARTIAL", [AUTH, "app/routers/catalog_db.py", CI], "Зависимость и защита есть, коды подтверждены тестами.", "Отдельный актуальный кадр Swagger Authorize еще не принят."),
    122: evidence("DONE", ["app/main.py", "tests/test_auth.py", CI], "Явные origins; тест неверного источника и cookie-origin."),
    123: evidence("DONE", [".gitignore", "app/config.py"], ".env исключен, secret_key обязателен без дефолта.", "Это статическая проверка текущих файлов, не полный secret-scan истории."),
    130: evidence("DONE", [AUTH, "tests/test_auth.py", "docs/permissions.md", CI], "Матрица прав: три роли, два ресурса, три изменяющих метода; учитывается 204 удаления."),
    132: evidence("DONE", ["react-app/src/api/client.ts", "app/services/auth.py", "docs/lab10/refresh-browser.json", "docs/lab10/validation.md"], "Реальный исторический браузерный сценарий TTL30: 401, refresh200, повтор204. Не новое production-подтверждение."),
    144: evidence("DONE", ["tests/conftest.py", CI], "Отдельная _test БД, savepoint, rollback, подмена get_db и токены ролей."),
    145: evidence("DONE", ["tests/test_catalog.py", CI], "Сохраненный CI подтверждает тесты 201 и тела."),
    146: evidence("DONE", ["tests/test_catalog.py", CI], "Тесты отсутствующих записей и 404."),
    147: evidence("DONE", ["tests/test_catalog.py", CI], "Тесты ограничений и 422."),
    148: evidence("DONE", ["tests/test_auth.py", CI], "Тесты 401/403 и параметризованная матрица."),
    149: evidence("DONE", ["tests/test_auth.py", "tests/test_catalog.py", CI], "Конфликт выдачи и доступности возвращает 409."),
    150: evidence("PARTIAL", ["docs/lab10/validation.md", CI], "Есть исторические повторения и два успешных набора CI.", "Два job CI не считаются доказательством именно двух последовательных команд на одном стенде. Отдельный парный протокол нужно выделить или получить."),
    151: evidence("DONE", ["react-app/vite.config.ts", "react-app/src/tests/BookForm.test.tsx", CI], "Vitest и компонентные проверки невалидной формы без отправки."),
    152: evidence("PARTIAL", ["docs/lab10/regression-red.txt", "tools/check_regression.py", "docs/lab10/validation.md"], "Реальный красный тест воспроизведен на копии прежней ветки.", "Патч преподавателя отсутствует; сохраненный разбор является собственной регрессией."),
    159: evidence("DONE", [CI, "tests/conftest.py"], "165 backend и 95 frontend; требуемый минимум превышен. Тесты используют изолированную БД."),
    161: evidence("DONE", ["tests/test_auth.py", "docs/permissions.md", CI], "18 комбинаций роль/метод/ресурс, коды и таблица прав."),
    173: evidence("DONE", [".github/workflows/ci.yml", CI, "docs/lab11/ci-results.txt"], "Сборка и запуск Compose реально выполнены CI; локальный Engine отсутствует."),
    174: evidence("PARTIAL", ["docker-compose.yml", "docs/docker-debug.md", CI], "В собственном проекте хост db; CI проверяет связность.", "Исходная сломанная конфигурация преподавателя не предоставлена."),
    175: evidence("PARTIAL", ["docker-compose.yml", "docs/docker-debug.md", CI], "Healthcheck/service_healthy реализованы и старт проверен CI.", "Нет журнала исправления предоставленного дефекта 2."),
    176: evidence("PARTIAL", ["docker-compose.yml", "docs/docker-debug.md", CI], "Сохранность собственного pgdata проверена CI.", "Нет исходного сломанного варианта преподавателя."),
    177: evidence("PARTIAL", ["react-app/nginx.conf", "docs/docker-debug.md", CI], "try_files и прямые SPA-ссылки проверены CI.", "Нет отдельного воспроизведения исходного дефекта 4."),
    178: evidence("PARTIAL", ["docker/api.Dockerfile", "react-app/Dockerfile", "docs/docker-debug.md"], "Порядок COPY исправен.", "Нет сопоставимого замера повторной сборки до/после правки одной строки на сломанном варианте."),
    179: evidence("PARTIAL", [".github/workflows/ci.yml", "docs/docker-debug.md", "docs/lab11/ci-results.txt"], "Диагностические команды описаны и часть выполнена CI.", "Не все команды, включая system df и интерактивный exec api sh, подтверждены отдельным протоколом."),
    180: evidence("DONE", [".github/workflows/ci.yml", CI], "Чистый старт выполнен на одноразовом CI runner.", "Рабочие тома не удаляются по прямому запрету пользователя."),
    185: evidence("DONE", ["docker-compose.yml", ".env.example", "README.md", "docs/lab11/ci-results.txt", CI], "Есть воспроизводимый запуск и вывод ps/images CI.", "Значения окружения необходимо заполнить; нельзя выдавать шаблонные секреты за готовую конфигурацию."),
    187: evidence("DONE", ["docker-compose.yml", ".github/workflows/ci.yml", CI], "Профиль test, отдельная test-db, 165 passed и корректная передача exit code."),
}


def add(ident: str, kind: str, week: int, section: str, record: dict, assessment: tuple,
        requirement: str | None = None, project: str = "BookNest") -> None:
    status, files, check, note = assessment
    rows.append({
        "id": ident, "source": ("веблекц.odt" if kind == "lecture" else "вебпр.odt"),
        "unit": f"{kind}-{week:02}", "section": section,
        "source_paragraph": record["paragraph"],
        "original_number": record.get("list_ordinal") if record.get("list_kind") == "number" else None,
        "requirement": requirement if requirement is not None else record["text"],
        "project": project, "status": status, "files": files,
        "check": check, "note": note, "commits": [],
    })


def homework(week: int, text: str, index: int) -> tuple:
    """Оценка каждого подпункта, а не общий статус всей лекции."""
    if week == 8:
        return [
            evidence("DONE", ["react-app/src/pages/loans/LoansPage.tsx", "react-app/src/features/loans/dates.ts", CI], "Личная выдача и фильтр в URL реализованы на текущем интегрированном проекте.", "Историческая ЛР6 не переписывается."),
            evidence("DONE", [FORM, "react-app/src/pages/books/BookFormPage.tsx"], "Создание и редактирование используют один компонент."),
            evidence("DONE", ["react-app/src/pages/not-found/NotFoundPage.tsx", ROUTES], "Маршрут * и осмысленная навигация присутствуют."),
            evidence("MISSING", ["docs/audit/LECTURE_HOMEWORK_CHECK.md"], "В прежней сверке отмечено отсутствие приложенного к исходному PR7 frontend-чек-листа.", "Проверить раздел 20 силлабуса, оформить собственный чек-лист и приложить к новому PR без изменения ЛР1-6."),
        ][index - 1]
    if week == 9:
        if "скриншот" in text:
            return evidence("DONE", ["docs/lab7/swagger.png"], "Настоящий исторический скриншот существует; это не кадр текущего production.")
        if "эндпоинта" in text:
            return evidence("DONE", ["app/routers/catalog.py", "app/repositories/memory.py", "docs/lab7/report.md"], "Историческая реализация памяти сохранена; текущая БД не заменяется словарем.")
        return evidence("DONE", ["docs/api-design.md"], "Проверено наличие таблиц контрактов и трех полных примеров; документ актуализирован до аудита.")
    if week == 10:
        return evidence("DONE", ["db/er.mmd", "db/schema.sql", "db/seed.sql", "db/queries.sql", "db/README.md", SQL], "7 таблиц, 3 типа связей, более 8 ограничений, 30 книг, 12 запросов и два плана индексов.", "Это исторический SQL-стенд; нагрузка и seed на Neon не повторяются.")
    if week == 11:
        return {
            1: PRACTICE[92],
            2: evidence("DONE", ["app/repositories/catalog.py", CI], "CRUD, фильтры, сортировка и пагинация в БД."),
            3: evidence("DONE", ["docs/lab8/n-plus-one-before.log", "docs/lab8/n-plus-one-after.log", "docs/audit/LECTURE_HOMEWORK_CHECK.md"], "Оба исторических лога 26/3 сохранены; в PR9 добавлены прямые ссылки по прошлой сверке."),
            4: evidence("DONE", ["docs/lab8/alembic-history.txt", ORM], "Не менее двух ревизий, реальный цикл отката и повторения сохранен."),
        }[index]
    if week == 12:
        if "однокурсника" in text:
            return evidence("EXCLUDED_PEER_TASK", [], "Чужой проект и взаимные задания исключены пользователем.")
        if any(word in text for word in ["секретов в репозитории", "HTTPS"]):
            return evidence("PARTIAL", ["docs/security-review.md", "docs/audit/http-redirect-20261114.json"], "Есть статусы и ссылки; HTTPS облачного сайта подтвержден.", "Полный исторический secret-scan и часть production-флагов отдельно не подтверждены.")
        return evidence("DONE", ["docs/security-review.md", AUTH, "app/core/security.py", CI], "Security Review содержит 15 строк со статусами, ссылками и оговорками.", "DONE означает заполненный пункт review, а не обещание отсутствия всех уязвимостей.")
    if week == 13:
        return [
            evidence("DONE", [".env.example", "README.md", "app/config.py", "react-app/vite.config.ts", CI], "Окружение и инструкции есть; изолированный CI воспроизводит запуск."),
            evidence("DONE", ["app/core/http.py", "react-app/src/api/client.ts", CI], "Единые code/message/details/request_id и toUserMessage."),
            evidence("DONE", [CI, "tests/conftest.py"], "165 backend/95 frontend превышают минимум; два набора не складываются как уникальные backend-сценарии."),
            evidence("PARTIAL", [CI, "docs/lab10/validation.md"], "Сохранены реальные результаты pytest и Vitest.", "Отдельное наличие обоих текстовых выводов в описании актуального PR нужно проверить при итоговой публикации."),
        ][index - 1]
    if week == 14:
        if "CI" in text or "workflow" in text:
            return evidence("DONE", [".github/workflows/ci.yml", CI], "Сохраненный CI 43584962994 success; новый запуск не заявляется.")
        if "вывод" in text:
            return evidence("DONE", ["docs/lab11/ci-results.txt", CI], "Вывод ps/images сохранен в CI-материалах.")
        if "удалить" in text or "Проверка" in text:
            return PRACTICE[180]
        return evidence("DONE", ["docker/api.Dockerfile", "react-app/Dockerfile", ".dockerignore", "react-app/.dockerignore", "docker-compose.yml", ".env.example", "README.md", CI], "Четыре основных сервиса db/api/seed/web, multi-stage, миграции, healthcheck и том.")
    if week == 15:
        return {
            1: evidence("EXCLUDED_PEER_TASK", [], "Ревью чужого проекта исключено."),
            2: evidence("EXCLUDED_PEER_TASK", [], "Получение и устранение замечаний чужого рецензента исключены."),
            3: evidence("PARTIAL", ["README.md", "AI_USAGE.md", "db/er.png"], "Основные разделы и публичный адрес есть.", "Итоговые пользовательские кадры и актуализация старых договоренностей об авторстве ожидаются."),
            4: evidence("PARTIAL", ["docs/lab12/defense.md", "docs/lab12/architecture.pptx"], "Семиминутный сценарий и слайд существуют.", "Актуальность слайда и визуальная приемка не подтверждены; сценарий содержит старую договоренность о самостоятельных ответах владелицы."),
            5: evidence("MISSING", ["docs/lab12/self-review.md", "docs/lab12/defense.md"], "Найден собственный разбор и максимумы рубрики.", "Заполненная официальная самооценка с собственными баллами и обоснованием не найдена."),
        }[index]
    raise ValueError(week)


def homework_parts(week: int, text: str) -> list[str]:
    """Явные (1), (2) сохраняются; перечисления разбиваются без перефразирования."""
    numbered = re.split(r"\(\d+\)\s*", text)
    if len(numbered) > 1:
        return [part.strip(" ;.") for part in numbered[1:] if part.strip()]
    if week == 9:
        beginning, more = text.split("Дополнительно", 1)
        parts = beginning.split(":", 1)[1].split(";")
        return [p.strip(" .") for p in parts] + [
            "Дополнительно " + more.split("и приложить", 1)[0].strip(),
            "приложить" + more.split("и приложить", 1)[1].split(". Документ", 1)[0],
        ]
    if week == 10:
        parts = text.split(":", 1)[1].split(";") if ";" in text else []
        if parts:
            return [p.strip() for p in parts]
        # Каждый фрагмент сохраняет дословный текст; общая фраза есть в полном источнике.
        return [
            "ER-диаграмма (dbdiagram.io или аналог)",
            "DDL-скрипт с не менее 6 таблицами",
            "всеми тремя типами связей",
            "не менее 8 ограничениями целостности",
            "скрипт наполнения тестовыми данными (не менее 30 строк в основной таблице)",
            "10 SQL-запросов с описанием прикладного смысла каждого",
            "2 индекса с обоснованием и приложенными планами запроса до и после",
            "Сдать в каталоге db/ с файлом db/README.md",
            "Схема защищается устно на практике недели 11 и является допуском к лабораторной 8",
        ]
    if week == 12:
        start = text.index("(") + 1
        end = text.index("). По")
        return [p.strip() for p in text[start:end].split(";")] + [
            text[end + 3:text.index("Дополнительно:")].strip(),
            text[text.index("Дополнительно:"):].strip(),
        ]
    if week == 14:
        main, verification = text.split("Проверка:", 1)
        return [main.strip(), "Проверка:" + verification.split("Приложить", 1)[0],
                "Приложить" + verification.split("Приложить", 1)[1].split("Настроить", 1)[0],
                "Настроить" + verification.split("Настроить", 1)[1]]
    return [text]


def criterion(week: int, part: str, related: list[dict]) -> tuple:
    """Критерии оцениваются отдельно, с учетом точного требуемого сценария."""
    files = list(dict.fromkeys(f for r in related for f in r["files"]))[:6]
    if week == 8:
        if any(word in part for word in ["фильтры", "404", "прямой ссылке"]):
            return evidence("DONE", [ROUTES, CI], "Маршруты и состояние URL подтверждены исходниками и сохраненным CI.")
        return evidence("PARTIAL", [FORM, SCHEMA, CI], "Механизмы есть у формы книги.", "Полный критерий именно для требуемой формы выдачи не закрыт.")
    if week == 9:
        if "Swagger" in part or "422 воспроизведена" in part:
            return evidence("PARTIAL", ["docs/lab7/swagger.png", "docs/lab7/api.http"], "Исторический Swagger и запросы сохранены.", "Полнота визуальных подтверждений актуального контракта еще не принята.")
        return evidence("DONE", ["app/routers/catalog.py", "app/schemas/__init__.py", "docs/api-design.md"], "Проверены имена ресурсов, схемы, коды и отсутствие глаголов в путях CRUD.")
    if week == 10:
        return evidence("DONE", ["db/schema.sql", "db/queries.sql", SQL], "Реляционная схема и результат SQL-стенда подтверждают конкретный критерий.", "Исторический стенд, а не новый прогон Neon.")
    if week == 11:
        return evidence("DONE", ["app/models.py", "app/db.py", ORM, "docs/lab8/n-plus-one-after.log", CI], "Структура и исторические проверки миграций, N+1 и API подтверждены.", "Полное сравнение двух схем отдельно отмечено PARTIAL в шаге 3.")
    if week == 12:
        if "четыре атаки" in part:
            return evidence("BLOCKED", ["docs/security-review.md"], "Преподавательский vuln-lab не предоставлен.", "Тесты защищенного BookNest не выданы за воспроизведение уязвимой версии.")
        if "секреты" in part:
            return evidence("PARTIAL", [".gitignore", "docs/security-review.md"], "Текущая конфигурация защищена.", "Полный исторический secret-scan не подтвержден.")
        return evidence("DONE", ["app/core/security.py", AUTH, "tests/test_auth.py", CI], "Хеширование, вход, роли и CORS подтверждены исходниками и сохраненными тестами.")
    if week == 13:
        if "повторный запуск" in part or "причина регрессии" in part:
            return evidence("PARTIAL", ["docs/lab10/validation.md", "docs/lab10/regression-red.txt", CI], "Исторические запуски и собственная регрессия есть.", "Нужна четкая пара последовательных запусков; патч преподавателя отсутствует.")
        return evidence("DONE", ["tests/conftest.py", "tests/test_auth.py", "react-app/src/tests/BookForm.test.tsx", CI], "Изоляция, коды, бизнес-правило и компонентное поведение подтверждены.")
    if week == 14:
        if "пять дефектов" in part:
            return evidence("PARTIAL", ["docs/docker-debug.md", CI], "Причины и решения описаны; собственный Compose проверен.", "Оригинальные пять сломанных файлов и отдельный замер кэша не предоставлены.")
        return evidence("DONE", ["docker-compose.yml", ".github/workflows/ci.yml", CI], "Изолированный CI проверил запуск, сохранность, SPA и доступ к psql.")
    return evidence("NOT_VERIFIED", files, "Критерий зарегистрирован для последующей приемки.")


answers = json.loads((ROOT / "docs/course/lecture-answers.json").read_text(encoding="utf-8-sig"))
for kind in ["lecture", "practice"]:
    source = json.loads((ODT / f"{kind}s.json").read_text(encoding="utf-8"))
    for key, records in source["units"].items():
        week = int(key)
        section, groups = "Заголовок", {}
        for record in records:
            text = record["text"]
            if text in ALL_SECTIONS:
                section = text
                groups.setdefault(section, [])
                continue
            groups.setdefault(section, []).append(record)
        inventory.append({
            "unit": f"{kind}-{week:02}", "title": records[1]["text"],
            "source": source["source"], "sha256": source["sha256"],
            "paragraph_start": records[0]["paragraph"], "paragraph_end": records[-1]["paragraph"],
            "sections": {name: [r["paragraph"] for r in value] for name, value in groups.items()},
        })
        if kind == "lecture":
            for index, record in enumerate(groups["Контрольные вопросы"], 1):
                if not record["text"].strip():
                    continue
                file = "docs/lab7/report.md" if week == 9 else "docs/course/lecture-answers.json"
                state = "MISSING" if week == 8 else "NOT_VERIFIED"
                files = [] if week == 8 else [file]
                note = "Отдельный комплект ответов лекции 8 не найден." if week == 8 else "Прежний ответ найден; техническая актуальность и полнота по новому источнику проверяются на этапе 3. Не генерируется заново без причины."
                if week >= 10:
                    assert index <= len(answers[str(week)])
                add(f"L{week:02}-Q{index:02}", kind, week, "Контрольные вопросы", record,
                    evidence(state, files, "Сопоставлен перечень вопросов и существующие материалы.", note))
            for record in groups["Домашнее задание"]:
                if not record["text"].strip():
                    continue
                for index, part in enumerate(homework_parts(week, record["text"]), 1):
                    assessment = homework(week, part, index)
                    if week == 10 and index == 9:
                        assessment = evidence("NOT_VERIFIED", ["db/README.md"], "Схема и объяснения есть.", "Факт устной защиты не подтвержден документом.")
                    add(f"L{week:02}-HW{index:02}", kind, week, "Домашнее задание", record, assessment, part)
                    if re.search(r"\(\d+\)", record["text"]):
                        rows[-1]["original_number"] = index
            if week == 8:
                record = groups["Домашнее задание"][0]
                prefix = record["text"].split("(1)", 1)[0].strip()
                add("L08-HW00", kind, week, "Контекст домашнего задания", record,
                    evidence("NOT_VERIFIED", ["docs/course/odt/lecture-08.txt"],
                             "Подготовка к промежуточному контролю зарегистрирована.",
                             "Не объявляется подтверждением участия в контроле; историческая ЛР6 не изменяется."),
                    prefix)
            for index, (start, end) in enumerate(EXAMPLES[week], 1):
                record = next(r for r in records if r["paragraph"] == start)
                assessment = evidence(
                    "PARTIAL", ["docs/audit/source-code-review.md"],
                    f"Статически прочитан фрагмент, абзацы {start}-{end}; найденные ограничения описаны.",
                    "Это пример преподавателя, не самостоятельный готовый модуль. Копирование в проект и исполнение всех фрагментов не заявляются.",
                )
                add(f"L{week:02}-EX{index:02}", kind, week, "Code examples", record, assessment)
                rows[-1]["row_kind"] = "CODE_EXAMPLE"
            # Нумерованный план является содержанием занятия, а не дополнительным
            # домашним заданием. Он учитывается отдельно и не раздувает список
            # обязательных исправлений приложения.
            for section_name, group in groups.items():
                covered = {r["source_paragraph"] for r in rows if r["unit"] == f"lecture-{week:02}"}
                for record in group:
                    if record["list_kind"] != "number" or record["paragraph"] in covered:
                        continue
                    add(f"L{week:02}-PLAN{record['list_ordinal']:02}", kind, week, section_name, record,
                        evidence("NOT_VERIFIED", [f"docs/course/odt/lecture-{week:02}.txt"],
                                 "Пункт программы прочитан и зарегистрирован.",
                                 "Контекст преподавательского занятия, не отдельное требование реализовать новый модуль или доказать посещение. Практические результаты учтены в HW/STEP."))
                    rows[-1]["row_kind"] = "SOURCE_CONTEXT"
        else:
            for section_name, tag in [("Пошаговое задание", "STEP"), ("Самостоятельная часть", "SELF"), ("Challenge task", "CH")]:
                for index, record in enumerate(groups[section_name], 1):
                    if not record["text"].strip():
                        continue
                    if week == 15:
                        assessment = evidence("EXCLUDED_PEER_TASK", [], "Оригинал относится к чужому проекту и взаимному ревью.", "Индивидуальные эквиваленты для собственного проекта зарегистрированы отдельно как P15-OWN.")
                    else:
                        assessment = PRACTICE[record["paragraph"]]
                    add(f"P{week:02}-{tag}{index:02}", kind, week, section_name, record, assessment)
            # Критерии регистрируются по отдельности; составной результат не
            # объявляется готовым при наличии только одного подходящего файла.
            for record in groups["Результат и критерии"]:
                if not record["text"].strip():
                    continue
                for index, part in enumerate(record["text"].split(";"), 1):
                    if week == 15:
                        assessment = evidence("EXCLUDED_PEER_TASK", [], "Исходный результат относится к взаимному ревью.")
                    else:
                        related = [r for r in rows if r["unit"] == f"practice-{week:02}" and "-CR" not in r["id"]]
                        assessment = criterion(week, part, related)
                    add(f"P{week:02}-CR{index:02}", kind, week, "Результат и критерии", record, assessment, part.strip())

# Индивидуальная практика 15 сохранена по прямому уточнению мастер-промпта.
# Эти строки не приписываются преподавателю как буквальная замена чужого проекта.
record = {"paragraph": 199, "text": "", "list_kind": None}
for index, (text, assessment) in enumerate([
    ("Самостоятельно проверить воспроизводимость собственного проекта по README.", evidence("PARTIAL", ["README.md", CI], "Изолированный CI выполняет сборку и запуск.", "Нужен отдельный разбор достаточности README без скрытых локальных настроек.")),
    ("Самостоятельно проверить основной пользовательский сценарий своего проекта.", evidence("PARTIAL", ["docs/lab10/validation.md", CI], "Сохранены локальный E2E и CI.", "Полная текущая ручная production-приемка ожидается.")),
    ("Самостоятельно проверить безопасность собственного проекта.", evidence("DONE", ["docs/security-review.md", CI], "Есть 15 пунктов review с кодом и ограничениями.", "Это не подтверждение отсутствия всех уязвимостей.")),
    ("Проверить структуру кода, повторы, ошибки и миграции на трех собственных файлах.", evidence("PARTIAL", ["docs/lab12/self-review.md"], "Есть прежний собственный разбор.", "Нужна актуальная сверка трех выбранных файлов и новых ограничений.")),
    ("Проверить собственную историю коммитов, README и результаты тестов.", evidence("PARTIAL", ["docs/audit/GIT_EVIDENCE.md", CI, "README.md"], "Реальная история и тесты сохранены.", "Количество не доказывает распределения работ по семестру; финальные кадры README ожидаются.")),
    ("Заполнить официальную самооценку и обосновать три минимальные оценки.", evidence("MISSING", ["docs/lab12/self-review.md"], "Заполненной официальной рубрики с баллами не найдено.")),
    ("Составить план собственных исправлений и подготовки к защите.", evidence("PARTIAL", ["docs/lab12/defense.md", "docs/audit/stages-progress.md"], "Планы есть.", "Нужна синхронизация после данного аудита и без ожидания peer review.")),
    ("Подтвердить измерением один собственный дефект производительности.", evidence("DONE", ["docs/lab8/n-plus-one-before.log", "docs/lab8/n-plus-one-after.log", "docs/improvements/stage12-orm-measurements.json"], "Сохранены исторические измерения N+1 26/3 и отдельные 41/3.", "Измерения разных стендов не смешиваются.")),
], 1):
    add(f"P15-OWN{index:02}", "practice", 15, "Индивидуальная часть по мастер-промпту", record, assessment, text)
    rows[-1]["source"] = "Мастер-промпт 14.11.2026, раздел 2"
    rows[-1]["source_paragraph"] = None


def last_commit(path: str) -> tuple[str, str]:
    """SHA является реальным последним изменением файла, не доказательством теста."""
    result = subprocess.run(
        ["git", "log", "-1", "--format=%h", "--", path],
        cwd=ROOT, capture_output=True, text=True, check=True,
    )
    return path, result.stdout.strip()


paths = sorted({f for row in rows for f in row["files"]})
for path in paths:
    assert (ROOT / path).is_file(), path
with ThreadPoolExecutor(max_workers=6) as pool:
    commits = dict(pool.map(last_commit, paths))
for row in rows:
    row.setdefault("row_kind", "ASSIGNMENT")
    row["commits"] = sorted({commits[f] for f in row["files"] if commits[f]})
assert len({r["id"] for r in rows}) == len(rows)
assert sum("-Q" in r["id"] for r in rows) == 82
counts = Counter(r["status"] for r in rows)
payload = {
    "date": "2026-11-14", "baseline": "cc256a7", "branch": "codex/lecture-practice-audit",
    "application_code": "98a1be3", "rows": rows, "counts": dict(counts),
    "new_application_tests": False, "source_inventory": inventory,
}
AUDIT.mkdir(parents=True, exist_ok=True)
(AUDIT / "requirements-matrix.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def cell(value: object) -> str:
    return str(value).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("|", r"\|").replace("\n", " ").replace("\r", "")


md = [
    "# Матрица лекций и практик 8-15", "",
    "14 ноября 2026. Основание cc256a7, прикладной код 98a1be3.",
    "Источник каждого пункта указан по абзацу ODT. Исходная автоматическая нумерация сохранена отдельно.",
    "Все строки и машинные данные: requirements-matrix.json. Полные тексты: docs/course/odt/.",
    "Теория, планы, Learning Objectives, демонстрации и примеры зарегистрированы в source-inventory.md.",
    "Матрица содержит вопросы, домашние задания и индивидуальные проверяемые результаты практик.",
    "Нумерованные планы SOURCE_CONTEXT сохранены для полноты, но не считаются дополнительными домашними заданиями. CODE_EXAMPLE означает анализ учебного фрагмента.",
    "DONE означает выполнение указанного пункта по приведенным подтверждениям, не завершение всей работы.",
    "Сохраненный CI/SQL/браузерный протокол не является новым запуском. SHA отражает последнее изменение файла, а не автоматически выполнение проверки.",
    "Исходные peer-задачи исключены, индивидуальные части практики 15 добавлены с явной ссылкой на мастер-промпт.",
    "", "Всего строк: " + str(len(rows)) + ". Статусы: " + ", ".join(f"{k}={v}" for k, v in sorted(counts.items())) + ".",
    "", "| ID | Источник и раздел | Требование дословно или индивидуальное уточнение | Проект | Статус | Файлы | Проверка | Коммиты файлов | Примечание |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
]
for r in rows:
    origin = f"{r['source']}, {r['unit']}, {r['section']}"
    if r["source_paragraph"] is not None:
        origin += ", абз. " + str(r["source_paragraph"])
    if r["original_number"] is not None:
        origin += ", исходный №" + str(r["original_number"])
    md.append("| " + " | ".join(cell(x) for x in [
        r["id"], origin, r["requirement"], r["project"], r["status"],
        "; ".join(r["files"]) or "-", r["check"], ", ".join(r["commits"]) or "-", r["note"],
    ]) + " |")
(AUDIT / "requirements-matrix.md").write_text("\n".join(md) + "\n", encoding="utf-8")
overview = ["# Индекс полностью прочитанных ODT", "",
            "Текстовые извлечения сохраняют код, пробелы, номера списков и номера абзацев.",
            "1511 абзацев лекций и 219 абзацев практик. Таблиц, изображений и встроенных объектов в обоих файлах нет.",
            "Наличие раздела означает его регистрацию, а не выполнение всех содержащихся примеров.",
            "Кодовые замечания: source-code-review.md. Все разделы и их номера абзацев также находятся в requirements-matrix.json.", ""]
for item in inventory:
    overview += ["## " + item["unit"] + " " + item["title"], "",
                 f"Источник {item['source']}, абзацы {item['paragraph_start']}-{item['paragraph_end']}.", ""]
    for section, numbers in item["sections"].items():
        if numbers:
            overview.append(f"- {section}: {len(numbers)} абзацев, {numbers[0]}-{numbers[-1]}.")
    overview.append("")
(AUDIT / "source-inventory.md").write_text("\n".join(overview).rstrip() + "\n", encoding="utf-8")
print(json.dumps({"rows": len(rows), "questions": 82, "counts": dict(counts), "files_verified": len(paths)}, ensure_ascii=False))
