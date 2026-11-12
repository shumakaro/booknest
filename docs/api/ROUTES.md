# Операции текущего API

Таблица получена из docs/api/openapi.json 12 ноября 2026. Указаны успешные коды и схема security из OpenAPI; точная роль и владение дополнительно проверяются серверными зависимостями.

| Метод | Путь | Успех | Тело успешного ответа | Security в OpenAPI |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/audit-events` | 200 | Page_AuditEventRead_ | Bearer |
| POST | `/api/v1/auth/confirm-email` | 200 | MessageRead | не задана |
| POST | `/api/v1/auth/logout` | 204 | без тела | Bearer необязателен |
| GET | `/api/v1/auth/me` | 200 | UserRead | Bearer |
| POST | `/api/v1/auth/refresh` | 200 | TokenRead | не задана |
| POST | `/api/v1/auth/register` | 201 | UserRead | не задана |
| POST | `/api/v1/auth/token` | 200 | TokenRead | не задана |
| GET | `/api/v1/authors` | 200 | Page_AuthorRead_ | не задана |
| POST | `/api/v1/authors` | 201 | AuthorRead | Bearer |
| GET | `/api/v1/authors/{item_id}` | 200 | AuthorRead | не задана |
| PATCH | `/api/v1/authors/{item_id}` | 200 | AuthorRead | Bearer |
| DELETE | `/api/v1/authors/{item_id}` | 204 | без тела | Bearer |
| GET | `/api/v1/authors/{item_id}/books` | 200 | Page_BookRead_ | не задана |
| GET | `/api/v1/books` | 200 | Page_BookRead_ | не задана |
| POST | `/api/v1/books` | 201 | BookRead | Bearer |
| GET | `/api/v1/books/{item_id}` | 200 | BookRead | не задана |
| PATCH | `/api/v1/books/{item_id}` | 200 | BookRead | Bearer |
| DELETE | `/api/v1/books/{item_id}` | 204 | без тела | Bearer |
| POST | `/api/v1/books/{item_id}/loans` | 201 | LoanRead | Bearer |
| GET | `/api/v1/discover/books` | 200 | ExternalPage | не задана |
| GET | `/api/v1/discover/books/{work_id}` | 200 | ExternalDetails | не задана |
| POST | `/api/v1/discover/imports` | 201, 200 | BookRead | Bearer |
| GET | `/api/v1/loans` | 200 | Page_LoanRead_ | Bearer |
| GET | `/api/v1/loans/{loan_id}` | 200 | LoanRead | Bearer |
| PATCH | `/api/v1/loans/{loan_id}` | 200 | LoanRead | Bearer |
| GET | `/api/v1/reports/overdue-loans` | 200 | Page_LoanRead_ | Bearer |
| GET | `/api/v1/wishlist` | 200 | Page_BookRead_ | Bearer |
| POST | `/api/v1/wishlist/{book_id}` | 204 | без тела | Bearer |
| DELETE | `/api/v1/wishlist/{book_id}` | 204 | без тела | Bearer |
| GET | `/health` | 200 | HealthRead | не задана |

Ролевые границы: изменение каталога/импорт, отчет просрочек и чтение журнала доступны Librarian. Личные желаемое и выдачи требуют текущего пользователя; доступ к конкретной выдаче проверяет владельца либо библиотекаря. Cookie-refresh и Origin проверяются отдельными правилами. Публичный поиск/каталог не получают права изменения из наличия кнопки.

Общие JSON-ошибки документированы через ErrorRead. CORS preflight и ответы прокси не объявляются ответами этих операций. См. README.md и tests/test_api_contracts.py.
