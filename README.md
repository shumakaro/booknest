# BookNest

Учебный книжный клуб: собственный каталог, поиск, роли читателя и библиотекаря, выдача/возврат и персональное желаемое. Это продолжение существующих лабораторных №1–6; файлы и история сохранены. Действующий React-клиент находится в react-app, FastAPI — в app.

## Стек и схема
Python 3.12, FastAPI, Pydantic 2, SQLAlchemy 2, Alembic, PostgreSQL 17, React 19, TypeScript 6 и Vite 8. Связи и ограничения описаны в [db/README.md](db/README.md), схема — [db/er.png](db/er.png). Дополнительные таблицы сеансов, аудита и желаемого вводятся последующими миграциями. Источник истины структуры — migrations, а не повторный запуск DDL.

## Конфигурация
На новой машине следует скопировать .env.example в .env и заменить параметры. В существующей рабочей папке .env уже создан: не заменять его примером. SECRET_KEY необходимо сгенерировать случайно, например `python -c "import secrets; print(secrets.token_hex(32))"`, и сохранить только локально.

| Переменная | Назначение |
|---|---|
| DATABASE_URL | PostgreSQL SQLAlchemy URL рабочей БД |
| TEST_DATABASE_URL | Отдельная база с суффиксом _test |
| SECRET_KEY | Обязательный случайный ключ от 32 символов |
| ACCESS_TTL_MIN | 15–30 минут, по умолчанию 15 |
| ACCESS_TTL_SECONDS | Только учебная короткая демонстрация; обычно не задаётся |
| REFRESH_TTL_DAYS | 1–7 дней, по умолчанию 7 |
| COOKIE_SECURE | false только для локального HTTP, true для HTTPS |
| CORS_ORIGINS | Явный JSON-массив разрешённых origins |
| WRITE_LIMIT | Изменяющие запросы с адреса за минуту |
| SQL_ECHO | Вывод SQL для учебной диагностики |
| VITE_API_TARGET | Адрес запущенного API для dev-proxy |
| VITE_API_BASE_URL | Относительный /api/v1, без секретов |
| VITE_PORT | Порт разработки клиента |
| PLAYWRIGHT_BASE_URL | Адрес запущенного интерфейса для e2e |
| PLAYWRIGHT_CHANNEL | Локально msedge либо пусто для установленного Chromium |

## Локальный запуск
Требуются Python 3.12, Node 24 и доступная PostgreSQL 17. На новой машине, если окружения ещё нет: `python -m venv .venv`, затем `.venv/Scripts/python -m pip install -r requirements-lock.txt`. В текущей папке зависимости уже установлены, повторное создание окружения не требуется.

Перед изменениями существующей БД проверяется `.venv/Scripts/python -m alembic current`. Новые ревизии: `.venv/Scripts/python -m tools.apply_pending`. Эта команда читает текущую версию, применяет только недостающие ревизии и проверяет сохранение количества основных записей; для совершенно пустой БД первичное создание выполняется `.venv/Scripts/python -m alembic upgrade head`.

Только для новой пустой БД выполняется `.venv/Scripts/python -m tools.seed`. В этой сессии данные уже есть; повторный seed, восстановление или initdb не нужны. Для проверки текущего состояния без записи используется `.venv/Scripts/python -m tools.resume_inspect`.

Сервер: `.venv/Scripts/python -m uvicorn app.main:app --reload`. Swagger: /docs, OpenAPI: /openapi.json, проверка процесса: /health. Клиент: `npm --prefix react-app ci`, затем `npm --prefix react-app run dev`. Vite передаёт /api на VITE_API_TARGET; исходники адреса сервера не содержат.

## Роли
Регистрация создаёт только member. Для локальной демонстрации предусмотрен `.venv/Scripts/python -m tools.create_demo_users`: создаются только отсутствующие роли, старые пароли не меняются. Случайные пароли сохраняются в .tools/demo-accounts.json, исключённом из Git. Такие данные не являются публичными проверочными учётными записями эксплуатационного сервера. Вход использует OAuth2; access хранится в памяти, refresh в HttpOnly cookie. В учебную консоль выводится временный код подтверждения e-mail; настоящая почта не отправляется.

## Проверки
На PostgreSQL нужно заранее создать отдельную БД booknest_test и задать TEST_DATABASE_URL. Схема тестовой базы обновляется только при наличии новых ревизий, а данные тестов откатываются.

```powershell
.venv/Scripts/python -m pytest -q --cov=app --cov-report=term-missing
.venv/Scripts/python -m ruff check app tests migrations examples
npm --prefix react-app run test
npm --prefix react-app run lint
npm --prefix react-app run build
npm --prefix react-app run test:e2e
```

Для e2e API и клиент должны быть запущены; нужны локальные демонстрационные роли и подходящий браузер. Без Edge Chromium устанавливается командой `npx playwright install chromium` из react-app. Сквозная проверка создаёт новую книгу, выполняет операции только с ней и затем мягко скрывает её; исходный каталог не удаляется.

## Документация и защита
[PROGRESS.md](PROGRESS.md) содержит фактические результаты и открытые пункты. Материалы и отчёты находятся в docs/lab7–lab12 по мере выполнения. Markdown и DOCX различаются только форматом; визуальная проверка DOCX требует рендерера и пока не подтверждена. Аудит — [docs/security-review.md](docs/security-review.md), права — [docs/permissions.md](docs/permissions.md), использование ИИ — [AI_USAGE.md](AI_USAGE.md).

Публичный адрес пока отсутствует: VPS и домен не предоставлены. Итоговый BookNest нельзя объявлять развёрнутым до фактической проверки HTTPS.
