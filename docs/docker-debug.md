# Диагностика Docker и Compose

Локально проверены конфигурации автономным Docker Compose v5.7.0: основной набор db/api/seed/web, профиль test и dev-override проходят config --quiet. Docker Engine отсутствует, pipe docker_engine не найден, WSL сообщает, что подсистема не установлена. Контейнеры локально не запускались; системная установка WSL/Docker не выполнялась.

## Практика 14 Пять учебных дефектов

Набор сломанных файлов преподавателя не предоставлен. Ниже приведён разбор симптомов и проверок для собственного проекта, а не выдуманный журнал запуска чужих конфигураций.

| Симптом | Причина | Исправление в BookNest | Как проверить при наличии Engine |
|---|---|---|---|
| API не подключается к БД | localhost указывает на API-контейнер | DATABASE_URL использует db:5432 | docker compose logs api; exec db pg_isready |
| API стартует слишком рано | Порядок запуска не равен готовности | healthcheck db и service_healthy | docker compose ps; logs db api |
| После пересоздания исчезли данные | Нет именованного тома | pgdata сохраняется без down -v | сравнить количество записей до и после down/up |
| Прямая /books/42 даёт 404 | Nginx не отдаёт SPA | try_files $uri $uri/ /index.html | открыть ссылку напрямую и обновить |
| Правка кода пересобирает зависимости | COPY исходников стоит до установки | зависимости копируются первым отдельным слоем | сравнить второй build по времени и CACHED |

## Команды

`docker compose ps`, `docker compose logs -f api`, `docker compose exec api sh`, `docker compose exec db psql -U <пользователь> -d <база>`, `docker image ls`, `docker system df`.

Основной запуск: `docker compose up -d --build --wait`. Тесты отдельно: `docker compose --profile test up --build --abort-on-container-exit --exit-code-from test test`. Для разработки: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build`.

## Сохранность

В существующем проекте down -v и docker system prune не применяются: пользователь запретил потерю данных. Чистый старт проверяется в отдельном одноразовом runner, а сохранность — обычным down без -v и повторным up. CI содержит оба smoke-запуска и сверку 30 активных книг, но успешный результат объявляется только после завершения workflow.

## Дополнительные задания

Профиль test использует собственный test-db без рабочего тома. Backend production и test — разные стадии, поэтому pytest/Ruff не увеличивают production-образ. Frontend собирается Node → Nginx. Образы публикуются в GHCR только при явном push тега v*, который в этой сессии не создавался. Отдельный dev-файл не подхватывается автоматически в эксплуатации.

Порог web <100 МБ и api <200 МБ проверяет tools/check_image_sizes.py по настоящему docker inspect; до запуска не считается достигнутым. В CI собираются образы, проверяются Nginx/SPA, тома, тестовый профиль и тот же e2e.
