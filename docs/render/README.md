# BookNest на Render и Neon

## Что подготовлено

Ветка: `lab-12/deployment`. Существующий Compose с PostgreSQL/Nginx сохранен для ЛР11–12. Дополнительно `docker/render.Dockerfile` собирает React и запускает FastAPI с готовой статикой в одном сервисе Render. Node/Vite не работают в production. API остается на `/api/v1`, прямая ссылка `/books/1` открывает React, неизвестный API возвращает JSON404. Сервер запускается от непривилегированного пользователя, слушает `0.0.0.0:$PORT` (по умолчанию10000). Порт и HTTPS снаружи обслуживает Render.

`docker/render.Dockerfile.dockerignore` исключает `.env`, локальные инструменты, Git, зависимости и документы из контекста сборки. Секреты не передаются frontend и не встраиваются в образ. Существующие миграции применяет guarded `tools.apply_pending`; seed/restore при старте отсутствуют. Neon уже содержит учебные данные.

## Поля New Web Service

| Поле | Значение |
|---|---|
| Repository | shumakaro/booknest |
| Name | booknest, либо свободное имя, предложенное Render |
| Language | Docker |
| Branch | lab-12/deployment |
| Root Directory | оставить пустым |
| Dockerfile Path | docker/render.Dockerfile |
| Docker Build Context Directory, если показано | . |
| Compute | Free, $0/month |
| Health Check Path, раздел Advanced | /health |
| Docker Command | оставить пустым, используется ENTRYPOINT |

Virginia из текущей формы допустима; близкий к Neon регион уменьшает задержку. Регион БД не следует угадывать по URL: он указан в панели Neon. Платный тариф и диск для этой конфигурации не нужны.

## Environment Variables

Значения подключений берутся из локального `.env` либо панели Connect существующего Neon-проекта. Они вводятся только в Render, не в чат, скриншот или Git. Не импортировать весь локальный `.env`: там есть настройки разработки и тестов.

| Key | Value |
|---|---|
| DATABASE_URL | текущий pooled URL Neon, адрес содержит -pooler |
| DATABASE_URL_UNPOOLED | текущий direct URL Neon без -pooler, для Alembic |
| SECRET_KEY | новый случайный секрет длиной минимум32 символа; кнопка Generate в Render |
| COOKIE_SECURE | true |
| SQL_ECHO | false |

В обоих URL сохраняется `sslmode=require` и другие выданные Neon параметры. `postgresql://` нормализуется к psycopg3 без изменения пароля. `TEST_DATABASE_URL`, `POSTGRES_PASSWORD`, `VITE_API_TARGET`, `PLAYWRIGHT_BASE_URL` не переносятся на Render. `CORS_ORIGINS` можно не задавать: при пустом списке приложение использует HTTPS origin из автоматически установленного Render `RENDER_EXTERNAL_URL`. Явный список имеет приоритет; для отдельного домена его нужно обновить. Cookie остается Secure; переключать false для публичного HTTPS нельзя.

После ввода переменных нажимается Deploy web service. Для приема нужны фактический URL и статус Live. Затем проверяются HTTPS `/health`, `/api/v1/books`, главная, прямая ссылка книги, вход, refresh, роли, выдача/возврат, избранное и выход. Доступ к БД с ноутбука сам по себе не доказывает доступ из Render.

## Проверки подготовки

Локально 10 ноября: Ruff passed; 62 Python-теста passed, coverage93%, одно предупреждение Starlette/anyio; npm run build passed, ESLint passed, 5 frontend-тестов passed. Первые запуски в ограниченной среде не имели доступа к локальной PostgreSQL/временной папке; успешный запуск использовал разрешенный доступ и новую временную папку `.tools/pytest-render-20261110b`. Тесты БД использовали только отдельную локальную базу с суффиксом `_test`.

Новые тесты проверяют SPA, ассеты, API404, отсутствие раздачи `.env`, origin Render и приоритет явного CORS. Локального Docker Engine нет; настоящие контейнеры проверены отдельным Linux runner.

[GitHub Actions42842553114](https://github.com/shumakaro/booknest/actions/runs/42842553114) завершен success для d7a85e6: jobs checks/containers успешны. Собран именно Render-образ, запущен с временной PostgreSQL runner, прошли HTTP smoke и браузерный сценарий через этот образ на8090 (1 passed7,1с). 62 Python-теста прошли на runner и внутри отдельного контейнера test; CI содержит два предупреждения зависимостей. Также проверены Compose, сохранность данных после down/up без удаления томов, backup/restore в новую БД и доверенный прокси Compose. Статус и SHA сохранены в ci-status.json, настоящие строки журнала — в ci-results.txt. Это доказательство работоспособности образа в CI, публичный Render проверяется после его отдельного запуска.

## Границы текущего этапа

Подготовка репозитория не означает, что сервис уже опубликован. URL/статус Live и реальная приемка после деплоя фиксируются отдельно. `/health` проверяет процесс; каталог и авторизация дополнительно проверяют БД. При Free возможен холодный старт после простоя. Локальный диск не используется для хранения БД: данные остаются в Neon.

Произвольным X-Forwarded-* приложение в этом образе не доверяет. До отдельной настройки доверенного прокси ограничения частоты могут быть общими для клиентов за одним адресом прокси; лимиты не отключены. Этот вариант управляемого хостинга не является доказательством заданий о самостоятельном VPS, SSH и firewall. Итоговые DOCX и полные описания PR обновляются на ранее согласованном отдельном этапе, PR не объединяются.

Источники: [Render — Docker](https://render.com/docs/docker), [переменные Render](https://render.com/docs/environment-variables), [Docker — исключения контекста](https://docs.docker.com/build/concepts/context/#dockerignore-files).
