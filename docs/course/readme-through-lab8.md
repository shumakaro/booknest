# BookNest

Учебный книжный клуб. Работы №1–6 сохранены; сервер добавлен в существующий репозиторий.

## Стек и запуск ЛР №7
Python 3.12, FastAPI, Pydantic 2. Из корня проекта:

```powershell
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python -m uvicorn app.main:app --reload
```

Swagger UI: `/docs`, ReDoc: `/redoc`, спецификация: `/openapi.json`, проверка процесса: `/health`.
Данные ЛР №7 находятся в памяти и исчезают после перезапуска. Сначала создаётся автор, затем книга с его `author_id`.

## Переменные окружения
`TITLE`, `VERSION` — метаданные; `WRITE_LIMIT` — число изменяющих запросов за минуту с одного адреса (по умолчанию 60); `CORS_ORIGINS` — JSON-массив разрешённых источников. Файл `.env` исключён из Git.

## Проверка
```powershell
.venv/Scripts/python -m pytest -q
.venv/Scripts/python -m ruff check app tests
```

Клиент предыдущих работ: `cd react-app`, `npm ci`, `npm run dev`. На этапе ЛР №7 клиент ещё использует Open Library — это предусмотрено заданием.

Подробные требования и незавершённые внешние проверки: `PROGRESS.md`. Использование ИИ раскрыто в `AI_USAGE.md`.
# Запуск PostgreSQL и миграций

Перед запуском сервера следует скопировать .env.example в .env и задать DATABASE_URL. PostgreSQL 17 должна быть запущена отдельно. Схема приложения создаётся командой `.venv/Scripts/python -m alembic upgrade head`, демонстрационные данные — `.venv/Scripts/python -m tools.seed`.

Нельзя применять db/schema.sql поверх мигрированной базы: это самостоятельная часть SQL-упражнений. Подробности схемы, проверок и индексов находятся в db/README.md.

Для тестов создаётся отдельная booknest_test и заполняется TEST_DATABASE_URL. Команда тестирования: `.venv/Scripts/python -m pytest -q`. Схема тестовой БД поднимается Alembic, данные каждого теста откатываются внешней транзакцией; commit в сервисе использует savepoint.
