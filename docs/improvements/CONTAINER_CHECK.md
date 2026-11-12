# Отдельный контейнерный стенд ЛР11

Эти команды предназначены для новой локальной проверки, а не для рабочей Neon/Render. Нужен работающий Docker Engine с Compose. На компьютере без Docker они не считаются выполненными; GitHub Actions проверяет их на отдельном runner.

1. Из корня создать случайную конфигурацию без вывода секретов:

```powershell
.venv/Scripts/python.exe -m tools.prepare_container_check
```

Существующий файл `.tools/containers-check.env` не перезаписывается. При повторной проверке используется тот же файл; новый пароль для уже созданного тома не генерируется. Рабочий `.env` не читается/не заменяется. Стенд привязан к loopback:8184, отдельному Compose project и сети 172.29.242.0/24; конфликт порта/сети разрешается явно, существующие сервисы не удаляются.

2. Проверить конфигурацию без печати раскрытых переменных и запустить стенд:

```powershell
docker compose --project-name booknest-local-check --env-file .tools/containers-check.env config --quiet
docker compose --project-name booknest-local-check --env-file .tools/containers-check.env up -d --build --wait
$env:BOOKNEST_CHECK_BASE_URL='http://127.0.0.1:8184'
$env:BOOKNEST_CHECK_IMMUTABLE='1'
.venv/Scripts/python.exe tools/check_container_http.py
```

Seed относится только к новому контейнерному стенду. Если в его БД уже есть книги, прежний скрипт пропускает наполнение. Проверка ожидает исходные 30 книг; ее не запускают как средство наполнения/исправления рабочей базы. Реальные пароли демонстрационных ролей находятся только в томе стенда, не в Git и не в документации.

3. Проверить независимый test-profile и код завершения:

```powershell
docker compose --project-name booknest-local-check --env-file .tools/containers-check.env --profile test up --build --abort-on-container-exit --exit-code-from test test
```

Test-образ содержит тесты, нужные tools, текущий OpenAPI и generated.ts. Runtime-образ их не получает. Test-profile использует отдельный test-db/booknest_test, а не БД приложения и не Neon. Pytest сохраняет JUnit в `/app/.tools/container-tests.xml`.

4. Для проверки сохранности можно остановить и снова запустить только этот project:

```powershell
docker compose --project-name booknest-local-check --env-file .tools/containers-check.env down
docker compose --project-name booknest-local-check --env-file .tools/containers-check.env up -d --wait
.venv/Scripts/python.exe tools/check_container_http.py
```

`down` выполняется без `-v`; команды удаления томов, prune и глобальной очистки не нужны. Рабочие сервисы других project не останавливаются.

CI дополнительно собирает единый образ без публикации на Render, проверяет runtime non-root/отсутствие тестов, размер образов, сохранность после перезапуска, восстановление backup в новую БД, браузерный сценарий и доверенный proxy rate limit. Это изолированный runner, не операция с готовыми публичными сервисами.
