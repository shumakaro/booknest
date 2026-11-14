"""Собирает материалы лекции 9 из исходных вопросов и проверенного API.

Не подключается к БД, не отправляет HTTP и не создает итоговый Word-отчет.
Старые ответы сохраняются как источник; новые входят в общий сборник позже.
"""
import json
import re
import subprocess
from pathlib import Path
from app.schemas import AuthorCreate, AuthorRead, BookCreate, BookRead, BookUpdate

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs/lectures"


def load(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def write(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


# Указываются действующие ограничения, а не только скрытые в интерфейсе кнопки.
# Общие технические ответы перечислены отдельно от предметных ошибок операций.
CATALOG = [
    ("GET", "/books", "Список книг", "Любая", "422"),
    ("POST", "/books", "Создать книгу", "librarian", "401,403,404,409,422,429"),
    ("GET", "/books/{item_id}", "Детали книги", "Любая", "404,422"),
    ("PATCH", "/books/{item_id}", "Изменить переданные поля", "librarian", "401,403,404,409,422,429"),
    ("DELETE", "/books/{item_id}", "Мягкое удаление книги", "librarian", "401,403,404,409,422,429"),
    ("GET", "/authors", "Список авторов", "Любая", "422"),
    ("POST", "/authors", "Создать автора", "librarian", "401,403,409,422,429"),
    ("GET", "/authors/{item_id}", "Детали автора", "Любая", "404,422"),
    ("PATCH", "/authors/{item_id}", "Изменить автора", "librarian", "401,403,404,409,422,429"),
    ("DELETE", "/authors/{item_id}", "Удалить автора без книг", "librarian", "401,403,404,409,422,429"),
    ("GET", "/authors/{item_id}/books", "Книги автора", "Любая", "404,422"),
    ("POST", "/books/{item_id}/loans", "Оформить выдачу", "member: себе; librarian: выбранному читателю", "401,403,404,409,422,429"),
    ("GET", "/loans", "Список выдач", "member: свои; librarian: все", "401,422"),
    ("GET", "/loans/{loan_id}", "Детали выдачи", "Владелец или librarian", "401,404,422"),
    ("PATCH", "/loans/{loan_id}", "Вернуть книгу", "Владелец или librarian", "401,404,409,422,429"),
    ("GET", "/reports/overdue-loans", "Просроченные выдачи", "librarian", "401,403,422"),
    ("GET", "/audit-events", "Журнал действий", "librarian", "401,403,422"),
    ("POST", "/auth/register", "Зарегистрировать читателя", "Любая", "409,422,429"),
    ("POST", "/auth/token", "Войти, получить access и refresh", "Любая с верными учетными данными", "401,422,429"),
    ("POST", "/auth/refresh", "Обновить токены", "Действующий refresh-cookie", "401,403,429"),
    ("GET", "/auth/me", "Свой профиль без хеша пароля", "Авторизованный пользователь", "401"),
    ("POST", "/auth/logout", "Отозвать сеанс и очистить cookie", "Access необязателен; проверяется Origin", "403,429"),
    ("POST", "/auth/confirm-email", "Подтвердить адрес одноразовым токеном", "Обладатель действующего токена", "401,422,429"),
    ("GET", "/wishlist", "Свой список желаемого", "Авторизованный пользователь", "401,422"),
    ("POST", "/wishlist/{book_id}", "Добавить в желаемое, повтор безопасен", "Авторизованный пользователь", "401,404,409,422,429"),
    ("DELETE", "/wishlist/{book_id}", "Убрать из желаемого", "Авторизованный пользователь", "401,422,429"),
    ("GET", "/discover/books", "Внешний поиск по названию и автору", "Любая", "422,502,503,504"),
    ("GET", "/discover/books/{work_id}", "Внешние подробности книги", "Любая", "404,422,502,503,504"),
    ("POST", "/discover/imports", "Импорт одной выбранной книги", "librarian", "401,403,404,409,422,429,502,503,504"),
    ("GET", "/health", "Жив ли процесс (без запроса в БД)", "Любая", "500"),
]

SOURCES = {
    "asgi": ["ASGI: Introduction", "https://asgi.readthedocs.io/en/latest/introduction.html"],
    "response": ["FastAPI: Response Model", "https://fastapi.tiangolo.com/tutorial/response-model/"],
    "errors": ["FastAPI: Handling Errors", "https://fastapi.tiangolo.com/tutorial/handling-errors/"],
    "patch": ["FastAPI: Body Updates", "https://fastapi.tiangolo.com/tutorial/body-updates/"],
    "depends": ["FastAPI: Dependencies", "https://fastapi.tiangolo.com/tutorial/dependencies/"],
    "async": ["FastAPI: Concurrency and async", "https://fastapi.tiangolo.com/async/"],
}

# Каждый ответ содержит теорию, связь с BookNest и короткий вариант для защиты.
# Ссылки вычисляются по маркерам, чтобы номера строк не приходилось придумывать.
ANSWERS = [
    {
        "answer": "WSGI задает синхронный интерфейс сервер–приложение для HTTP. ASGI описывает обмен событиями через scope, receive и send и поддерживает, в частности, HTTP и WebSocket. Uvicorn является ASGI-сервером: принимает сетевой запрос и вызывает FastAPI. Он не заменяет сам фреймворк. Асинхронный интерфейс не превращает синхронный драйвер БД в неблокирующий.",
        "booknest": "Приложение собирается create_app в app/main.py. Учебная версия с памятью отдельно находится в app/legacy.py и не подменяет действующий SQLAlchemy API. В этом блоке TestClient вызывает приложения в процессе: запуск отдельного Uvicorn и публичное развертывание не заявляются.",
        "oral": "ASGI передает события и допускает асинхронную работу. WSGI использует синхронный интерфейс. Uvicorn запускает FastAPI как ASGI-приложение.",
        "demo": "Показать две фабрики приложения и их разные зависимости. Не называть TestClient отдельным запущенным сервером.",
        "refs": [("app/main.py", "def create_app"), ("app/legacy.py", "def create_app")], "sources": ["asgi", "async"],
    },
    {
        "answer": "Получение списка — GET /api/v1/books, создание — POST /api/v1/books с телом BookCreate. Выдача книги №42 — POST /api/v1/books/42/loans с телом LoanCreate. URL обозначает ресурс, а действие задается HTTP-методом. Сервер возвращает идентификатор созданной выдачи; это другой идентификатор, чем номер книги.",
        "booknest": "LoanCreate содержит due_date и необязательный user_id. Читатель оформляет выдачу себе; библиотекарь может выбрать другого читателя. Возврат выполняется PATCH /api/v1/loans/{loan_id} с состоянием returned, поэтому подставлять book_id вместо loan_id нельзя. Тестовый пример с №42 не является существующей production-записью.",
        "oral": "GET читает список, POST создает книгу. Выдача — отдельный ресурс loans внутри книги. Для возврата нужен ID выдачи.",
        "demo": "В спецификации найти эти три операции. Создание и выдачу выполнять только на своей тестовой записи при отдельной ручной приемке.",
        "refs": [("app/routers/catalog_db.py", '"/books"'), ("app/routers/loans.py", "def issue_book")], "sources": [],
    },
    {
        "answer": "201 означает создание ресурса; 204 — успешное действие без тела ответа. 400 обозначает некорректный запрос, 404 — отсутствие доступного ресурса, 409 — конфликт с текущими данными, 422 — нарушение схемы или правил входных полей. Пустой список остается успешным ответом 200. Отдельно 401 означает необходимость действующей аутентификации, 403 — недостаточное разрешение.",
        "booknest": "В памяти проверены создание 201, повтор ISBN 409, неизвестный ID 404, неверный год 422 и удаление 204 с пустым телом. В текущем API чужая выдача скрывается за 404. Ошибка типа параметра дает 422, а не 404. Код 400 указан в общих ответах; CORS может вернуть собственный текстовый 400 для неверного preflight — его нельзя выдавать за JSON-ошибку каталога.",
        "oral": "201 — создано; 204 — выполнено без тела. 404 — не найдено, 409 — конфликт. 422 показывает ошибку входных данных.",
        "demo": "Открыть memory_http_cases и показать фактические коды и пустой DELETE. Не приписывать этому прогону проверки настоящих выдач в PostgreSQL.",
        "refs": [("app/core/http.py", "ERROR_RESPONSES"), ("app/core/auth.py", "def get_own_loan"), ("tools/check_lecture09_contracts.py", "deleted = record")], "sources": ["errors"],
    },
    {
        "answer": "Create описывает допустимые поля создания, Update — изменения, Read — публичный результат. Это не позволяет клиенту самостоятельно задавать серверные поля и помогает скрывать служебные данные. Например, id книги присутствует в BookRead, но не в BookCreate. Пропуск поля Update и явный null имеют разный смысл: разрешение очистки зависит от конкретного поля.",
        "booknest": "BookCreate задает обязательные поля, BookUpdate допускает их пропуск, а BookRead добавляет id, author, available и внешние идентификаторы. Для пользователей пароль принимается RegisterRequest, но не выдается через UserRead. В PATCH ISBN можно очистить, а обязательное название нельзя превратить в null.",
        "oral": "Create принимает данные новой записи. Update различает пропуск и изменение. Read содержит только разрешенные поля ответа, включая серверный id.",
        "demo": "Сравнить model_fields трех схем и nullable/required в OpenAPI; не отправлять настоящие пароли в протокол.",
        "refs": [("app/schemas/__init__.py", "class BookCreate"), ("app/schemas/__init__.py", "class BookUpdate"), ("app/schemas/__init__.py", "class BookRead"), ("app/schemas/auth.py", "class RegisterRequest")], "sources": ["response", "patch"],
    },
    {
        "answer": "response_model описывает схему ответа, участвует в его проверке, сериализации и фильтрации и попадает в OpenAPI. Отдельная публичная схема помогает предотвратить избыточную выдачу данных, например password_hash. Это не заменяет проверку токена, роли или владельца: разрешенный набор полей и разрешение доступа являются разными проверками.",
        "booknest": "Маршрут /auth/me использует UserRead, который не содержит password_hash. Локальная проверка передала фиктивный служебный ключ в UserRead и убедилась, что его нет в model_dump. Это проверка схемы, а не новый HTTP-запрос /me с настоящим пользователем. Каталог также возвращает BookRead вместо произвольного ORM-объекта.",
        "oral": "response_model ограничивает и проверяет выходные поля. Это защищает от случайной утечки служебных данных. Права доступа сервер проверяет отдельно.",
        "demo": "Показать response_model=UserRead и безопасную проверку с фиктивным полем в протоколе.",
        "refs": [("app/routers/auth.py", "def me"), ("app/schemas/auth.py", "class UserRead"), ("tools/check_lecture09_contracts.py", "public_user =")], "sources": ["response"],
    },
    {
        "answer": "Pydantic формирует сведения о нарушениях схемы, а FastAPI преобразует ошибки входного запроса в HTTP 422. Стандартный формат FastAPI использует detail со списком ошибок. В BookNest обработчик намеренно заменяет его единым конвертом code, message, details и request_id. Каждый элемент details содержит loc, msg и type. Ошибка выходной модели является серверной проблемой, а не ошибкой пользователя 422.",
        "booknest": "validation_error исключает input и ctx, чтобы не вернуть пароль или другое присланное значение. HTTP-протокол подтвердил 422 для year=\"давно\" и точный набор полей конверта. loc указывает участок запроса и поле. Зависимости могут исполняться до обработчика маршрута, поэтому нельзя строить безопасность на предположении, что неверное тело вообще не вызовет зависимостей.",
        "oral": "Неверный вход дает 422. В нашем проекте ошибки полей лежат в details. Исходное значение поля обратно не возвращается.",
        "demo": "Найти реальный 422 в протоколе и сравнить его с ErrorRead в Swagger.",
        "refs": [("app/core/http.py", "async def validation_error"), ("app/schemas/__init__.py", "class ErrorRead")], "sources": ["errors"],
    },
    {
        "answer": "Depends объявляет, что обработчику нужен результат другой функции. FastAPI разрешает цепочку зависимостей и передает результат в параметр, а yield-зависимость может освободить ресурс после обработки. Два применения: получение сессии БД и проверка текущего пользователя. Проверку роли можно построить поверх зависимости пользователя.",
        "booknest": "Database передает Session, CurrentUser проверяет токен, Librarian добавляет ограничение роли. Pagination переиспользует ограничения page и size. В тестах dependency_overrides подменяет внешнего клиента; это управляемая тестовая подмена, а не отключение production-защиты. В безопасном прогоне любые Engine.connect запрещены дополнительно.",
        "oral": "Depends собирает необходимые обработчику значения. В BookNest это сессия БД и текущий пользователь. Проверку роли тоже можно оформить зависимостью.",
        "demo": "Открыть цепочку CurrentUser → get_current_user и Librarian → require_role.",
        "refs": [("app/core/auth.py", "Database ="), ("app/core/auth.py", "def require_role"), ("app/core/pagination.py", "class Pagination")], "sources": ["depends"],
    },
    {
        "answer": "PUT обычно задает полное новое представление ресурса, PATCH — только указанные изменения. model_dump(exclude_unset=True) исключает поля, которые клиент не передал, но сохраняет явно переданные null или значения, совпадающие с умолчанием. Это не равно exclude_none. Допустимость null все равно проверяет схема. Сам model_copy(update=...) не заменяет полную валидацию итогового состояния.",
        "booknest": "Рабочий каталог использует PATCH. CatalogService.save объединяет изменения с сохраненными полями и повторно проверяет BookCreate: так год выпуска и год издания не конфликтуют после частичного обновления. В памяти PATCH только названия сохранил остальные поля. Единственный DB-тест null-правил намеренно не вошел в этот прогон; проверка реального SQL-обновления здесь не заявляется.",
        "oral": "PATCH изменяет переданные поля. exclude_unset оставляет именно их. Затем нужно проверить допустимость получившейся записи.",
        "demo": "Показать model_dump(exclude_unset=True), объединение и BookCreate.model_validate; сравнить HTTP-ответ до и после изменения названия.",
        "refs": [("app/routers/catalog_db.py", "exclude_unset=True"), ("app/services/catalog.py", "merged.update(data)")], "sources": ["patch"],
    },
    {
        "answer": "OpenAPI дает машиночитаемое описание путей, методов, параметров, схем, безопасности и ответов. Swagger UI позволяет изучать его и отправлять запросы без React. Дополнительно API проверяется curl, HTTP-клиентом или TestClient. Схему нужно сверять с приложением, иначе сохраненный JSON и сгенерированные типы могут совместно устареть.",
        "booknest": "Проверено совпадение приложения с docs/api/openapi.json и TypeScript-типами; в схеме 22 пути и 30 операций. Найдено и устранено отсутствие описаний 502/503/504 на трех маршрутах Open Library. Исторический настоящий кадр Swagger хранится в docs/lab7/swagger.png. Новый GET /docs подтвердил HTML, но это не новый скриншот браузера и не полноценная проверка интерактивной CDN-загрузки.",
        "oral": "OpenAPI описывает контракт для человека и программ. Swagger показывает его и позволяет вызвать API. В тестах схема сверяется с приложением и типами клиента.",
        "demo": "Показать описание Retry-After у 503 и сначала падавшие, затем успешные проверки контракта.",
        "refs": [("tests/test_api_contracts.py", "def test_live_schema_snapshot"), ("app/routers/discover.py", "UPSTREAM_RESPONSES"), ("app/legacy.py", "def create_app")], "sources": ["response"],
    },
    {
        "answer": "Блокирующий вызов внутри async def занимает поток цикла событий и задерживает другие задачи в этом процессе. await дает возможность переключаться только для действительно асинхронной операции. Синхронные обработчики и зависимости def FastAPI обычно выполняет через пул потоков. Обычный helper, вызванный напрямую внутри async def, автоматически туда не переносится. Для тяжелой CPU-работы обычно нужен отдельный процесс или очередь.",
        "booknest": "Рабочие маршруты с синхронным SQLAlchemy объявлены def. Open Library также вызывается синхронным обработчиком def через httpx; это не async-драйвер. Асинхронное middleware ожидает call_next. Переписывание только слова def на async def без замены ввода-вывода ухудшило бы поведение. Нагрузочный тест конкурентности в этом блоке не запускался.",
        "oral": "Блокирующий вызов останавливает цикл событий. Для async нужен неблокирующий ввод-вывод. Синхронный маршрут можно оставить def.",
        "demo": "Сравнить def search_books и async middleware; объяснить, почему синхронный клиент не становится асинхронным от переименования функции.",
        "refs": [("app/routers/discover.py", "def search_books"), ("app/core/http.py", "async def trace")], "sources": ["async"],
    },
]


def main() -> None:
    """Проверяет соответствие материалов исходнику перед сохранением."""
    OUT.mkdir(parents=True, exist_ok=True)
    lecture = load("docs/course/odt/lectures.json")
    questions = [r for r in lecture["units"]["9"] if 360 <= r["paragraph"] <= 369]
    assert len(questions) == len(ANSWERS) == 10
    old = (ROOT / "docs/lab7/report.md").read_text(encoding="utf-8").split("## 11 Контрольные вопросы лекции 9", 1)[1]
    prior = re.findall(r"### ([^\n]+)\n(.*?)(?=\n### |\Z)", old, flags=re.S)
    assert len(prior) == 10
    records = []
    for i, (question, answer) in enumerate(zip(questions, ANSWERS, strict=True), 1):
        # Формулировка берется из ODT, а не сочиняется на основании темы.
        text = question["text"]
        text = re.sub(r"^\d+\.\s*", "", text)
        refs = []
        for path, marker in answer["refs"]:
            lines = (ROOT / path).read_text(encoding="utf-8").splitlines()
            line = next(n for n, content in enumerate(lines, 1) if marker in content)
            refs.append({"path": path, "line": line, "marker": marker})
        records.append({**answer, "id": f"L09-Q{i:02}", "number": i,
                        "question": text, "source_paragraph": question["paragraph"], "refs": refs,
                        "previous_answer": prior[i - 1][1].strip(),
                        "previous_answer_source": "docs/lab7/report.md#11"})
    schema = load("docs/api/openapi.json")
    pairs = {(m.upper(), p): op for p, obj in schema["paths"].items()
             for m, op in obj.items() if m in {"get", "post", "patch", "delete", "put"}}
    mapped = []
    for method, path, purpose, role, errors in CATALOG:
        full = path if path == "/health" else "/api/v1" + path
        operation = pairs[(method, full)]
        codes = [c for c in operation["responses"] if c.startswith("2")]
        assert all(e in operation["responses"] for e in errors.split(","))
        mapped.append({"method": method, "path": full, "purpose": purpose, "role": role,
                       "success": codes, "errors": errors, "operation_id": operation["operationId"]})
    assert len(mapped) == len(pairs) == 30
    assert {(r["method"], r["path"]) for r in mapped} == set(pairs)
    write(OUT / "lecture-09-api-map.json", {"paths": len(schema["paths"]), "operations": mapped})

    # Прежние три полных примера сохраняются буквально; меняется полнота спецификации.
    design_path = ROOT / "docs/api-design.md"
    original = design_path.read_text(encoding="utf-8")
    examples = original.split("## Три ключевые операции", 1)[1].split("## Ошибка", 1)[0]
    # Проверяются все тела трех пар запрос/ответ, а не только наличие Markdown.
    inline = re.findall(r"`(\{[^`\n]+\})`", examples)
    blocks = re.findall(r"```json\n(.*?)\n```", examples, flags=re.S)
    assert len(inline) == 2 and len(blocks) == 4
    for model, example in zip(
        [AuthorCreate, AuthorRead, BookCreate, BookRead, BookUpdate, BookRead],
        inline + blocks, strict=True,
    ):
        model.model_validate_json(example)
    md = [
        "# Проектирование API BookNest", "",
        "Актуализация лекции 9 от 14 ноября 2026. Проверенный контракт: 22 пути, 30 операций. "
        "Он описывает локальную версию ветки codex/lecture-09-materials; публикация Render этим документом не подтверждается.", "",
        "## Ресурсы и права", "",
        "Ресурсы: книги и авторы, пользователи и сеансы, выдачи, список желаемого, события аудита, "
        "отчет по просрочкам и внешний каталог. Не каждой таблице БД нужен самостоятельный публичный CRUD. "
        "Основной префикс /api/v1; /health расположен отдельно. Совместимые скрытые /auth/* не являются дополнительными бизнес-ресурсами.", "",
        "| Метод | Полный путь | Назначение | Успех | Предметные ошибки и отказы | Доступ |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    md += [f"| {r['method']} | {r['path']} | {r['purpose']} | {','.join(r['success'])} | {r['errors']} | {r['role']} |"
           for r in mapped]
    md += ["", "### Правила доступа и состояния", "",
           "Публичное чтение каталога не требует JWT. Изменение книг, авторов и импорт требуют librarian. "
           "Читатель видит только свои выдачи и желаемое; библиотекарь видит все выдачи. "
           "Чужая выдача возвращает 404, чтобы не раскрывать ее существование. При создании выдачи user_id другого читателя разрешен только библиотекарю.", "",
           "POST /auth/token принимает OAuth2-форму username/password, а не JSON. Refresh хранится в HttpOnly-cookie, "
           "обновление ротирует токен; refresh/logout проверяют Origin. Logout допускает отсутствие access-токена и возвращает 204. "
           "Подтверждение email требует действительного одноразового токена. Детали cookie и секреты не включаются в примеры.", "",
           "DELETE книги выполняет мягкое удаление; активная выдача препятствует удалению. Автора с книгами удалить нельзя. "
           "Возврат: PATCH /loans/{loan_id}, тело {\"state\":\"returned\"}. Повторное добавление в желаемое не создает вторую строку. "
           "Повторный импорт уже известной внешней книги возвращает 200, новое создание — 201.", "",
           "## Пагинация и фильтрация", "",
           "Локальные списки используют page от 1 и size от 1 до 100; ответ {items,total,page,size}. "
           "Фильтры применяются до total и ограничения страницы: поиск охватывает всю подходящую локальную выборку, а не первые 30 записей. "
           "Books: q по названию или автору, genre, available_only; q нормализует лишние пробелы, % и _ являются буквальными символами. "
           "EXISTS по автору не размножает книги. sort принимает title, year, id через запятую, минус означает убывание; "
           "id добавляется для стабильности. search_mode=fulltext — дополнительный режим по названию. "
           "Authors поддерживает q; выдачи — state=all|active|overdue|returned. Перечень параметров остальных списков определен в OpenAPI.", "",
           "Глобальный каталог независим от PostgreSQL: GET /discover/books требует хотя бы title или author после trim, "
           "page 1–1000, size 1–40. Возвращаются название, авторы, год, обложка и total/page/size/items. "
           "work_id имеет вид OL123W, а локальный id — целое число. Подробности запрашиваются отдельным GET; "
           "POST /discover/imports переносит только выбранную книгу, массовая загрузка каталога не выполняется.", "",
           "## Три ключевые операции" + examples,
           "## Ошибка", "",
           '~~~json\n{"code":"HTTP_404","message":"Запись не найдена","details":null,"request_id":"UUID"}\n~~~', "",
           "При 422 details — список {loc,msg,type}; input не возвращается. request_id совпадает с X-Request-ID. "
           "Это намеренное отличие от стандартного FastAPI detail. Непредвиденная ошибка дает безопасный 500 без SQL/трассировки в ответе.", "",
           "Общие описания 400/401/403/404/405/409/422/429/500 подключены централизованно: наличие кода в OpenAPI "
           "не означает, что каждый маршрут имеет предметный сценарий для каждого кода. "
           "В таблице выделены относящиеся к операции ошибки; 405 и 500 могут возникнуть технически. "
           "CORS middleware может вернуть собственный текстовый 400 для preflight вне JSON-конверта.", "",
           "Внешний сервис: 502 — поврежденный/непригодный ответ, 503 — временная занятость или ограничение, "
           "504 — таймаут. При 503 Retry-After сообщает задержку повторения в секундах. "
           "Ограничение записи приложения дает 429 и Retry-After: 60. Пустой успешный поиск остается 200 с items=[].", "",
           "## Учебный API в памяти и доказательства", "",
           "app/legacy.py — сохраненная реализация ЛР7 с MemoryStore и двумя ресурсами /books, /authors. "
           "В ней проверяется контракт без PostgreSQL и без авторизации; она не заменяет app/main.py и не публикуется вместо рабочего сервиса. "
           "11 HTTP-проверок подтвердили 200/201/204/404/409/422 и Swagger HTML. "
           "Реальный исторический скриншот: docs/lab7/swagger.png. Новый браузерный скриншот не сделан.", "",
           "Протоколы: docs/lectures/lecture-09-contract-before.json и lecture-09-validation.json. "
           "OpenAPI сверена с приложением, типы TypeScript не изменились. Соединения с БД запрещены технически; "
           "полный PostgreSQL-набор и production CRUD в этом блоке не запускались. "
           "Взаимная проверка исключена по мастер-промпту как EXCLUDED_PEER_TASK; индивидуальная самопроверка выполнена.", ""]
    design_path.write_text("\n".join(md), encoding="utf-8")
    payload = {"lecture": 9, "title": "FastAPI и REST API", "date": "2026-11-14",
               "application_baseline": "605d0d5", "source": "веблекц.odt",
               "source_sha256": load("docs/lectures/lecture-08.json")["source_sha256"],
               "questions": records, "sources": SOURCES,
               "validation": "docs/lectures/lecture-09-validation.json"}
    write(OUT / "lecture-09.json", payload)
    md = ["# Лекция 9. FastAPI и REST API", "",
          "Материалы для общего отчета по лекциям 8–15. Итоговый DOCX собирается после доработок и пользовательских скриншотов.", "",
          "10 исходных вопросов: веблекц.odt, абзацы 360–369; домашнее задание — абзац 371. "
          "Прежние ответы ЛР7 сохранены, дополнены и сверены с текущими схемами, ролями и обработчиками ошибок.", ""]
    for r in records:
        md += [f"## Вопрос {r['number']}", "", r["question"], "",
               "**Полный ответ.** " + r["answer"], "", "**BookNest.** " + r["booknest"], "",
               "**Код.** " + "; ".join(f"[{x['path']}:{x['line']}](../../{x['path']}#L{x['line']})" for x in r["refs"]), "",
               "**Краткий ответ.** " + r["oral"], "", "**Демонстрация.** " + r["demo"], ""]
        if r["sources"]:
            md += ["**Документация.** " + ", ".join(f"[{SOURCES[k][0]}]({SOURCES[k][1]})" for k in r["sources"]), ""]
    md += ["## Домашнее задание и реальные проверки", "",
           "- docs/api-design.md: все ресурсы, 30 операций с ролями/кодами, три полных примера, ошибки, пагинация и фильтры.",
           "- app/legacy.py и app/routers/catalog.py: сохранены два ресурса в памяти; выполнены 11 HTTP-проверок.",
           "- Swagger: исторический настоящий PNG сохранен; новый GET /docs проверил HTML, а не браузерное изображение.",
           "- До исправления описаний внешних ошибок: 7 failed, 37 passed, 1 deselected. После: 44 passed, 1 deselected.",
           "- Один DB-тест исключен намеренно. 0 попыток соединения с БД, секреты и env-файлы не изменялись.",
           "- Предупреждение PytestAssertRewriteWarning для anyio сохранено: модуль импортирован TestClient до запуска pytest.",
           "- Новый frontend build, Docker build и публичное развертывание в этом блоке не выполнялись. Типы TS совпадают с проверенной схемой.",
           "", "Точные счетчики и HTTP-ответы: lecture-09-validation.json. Доказательства не заменяют личную защиту и ручные кадры.", ""]
    (OUT / "lecture-09.md").write_text("\n".join(md), encoding="utf-8")
    legacy_path = ROOT / "docs/course/lecture-answers.json"
    legacy = load("docs/course/lecture-answers.json")
    before = json.loads(subprocess.check_output(
        ["git", "show", "605d0d5:docs/course/lecture-answers.json"], cwd=ROOT, text=True, encoding="utf-8"))
    assert {k: v for k, v in legacy.items() if k != "9"} == before
    legacy["9"] = [r["answer"] + " " + r["booknest"] for r in records]
    write(legacy_path, legacy)
    print(json.dumps({"questions": len(records), "code_references": sum(len(r["refs"]) for r in records),
                      "api_operations": len(mapped), "validated_example_bodies": 6,
                      "preserved_previous_lectures": sorted(before)}))


if __name__ == "__main__":
    main()
