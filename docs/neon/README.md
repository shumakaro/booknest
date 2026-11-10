# Подключение BookNest к Neon

10 ноября 2026. Часть четвертого этапа: только Neon. Render и Telegram не настраивались; публичный HTTPS сайта пока отсутствует.

## Выполненные команды и фактический результат

1. npm i -g neon@latest — установлено 159 пакетов; neon --version: 9.3.2. npm сообщил о пропущенном postinstall esbuild; выполнение CLI/config plan/deploy впоследствии прошло, дополнительное разрешение скриптов и глобальные настройки npm не менялись.
2. neon init -y --org-id org-steep-queen-40161311 --project-id frosty-boat-51024121 --branch production --services postgres — записаны .neon и neon.ts, установлены @neon/config 1.14.0 и @neon/env 2.1.3. Первоначальная привязка была offline/no-checks и не выдавалась за подтвержденный доступ.
3. neon deploy — открыл браузерную авторизацию, которую завершила владелица. Auth complete (profile DEFAULT). Applying to branch production (br-fragrant-forest-beders6x). No changes — branch production already matches the policy. Utilized services: Postgres. Pulled 5 Neon variables into .env.
4. neon config plan — подтвердил отсутствие дальнейших изменений политики. Новые проекты и дополнительные Neon-сервисы не создавались.

Не подключались Neon Auth, Data API, Functions, Storage, Realtime или AI Gateway. NEON_FUNCTION_HOST_SUFFIX — автоматически загруженная переменная CLI, а не доказательство развернутой функции. JWT-авторизация BookNest осталась в FastAPI.

## Навыки и MCP

Получена указанная владелицей актуальная инструкция https://neon.com/.well-known/agent-skills/neon/SKILL.md, прочитаны необходимые части; также использованы установленные neon и neon-postgres. Веб-инструмент не смог загрузить файл, поэтому он скачан штатным HTTPS-клиентом в игнорируемую .tools/neon-current-skill.md.

CLI init автоматически установил Neon plugin user-scope для Codex и VS Code. В кэше Codex фактически присутствует plugins-cli/neon-postgres/3.0.5 с навыками и mcp.json, содержащим https://mcp.neon.tech/mcp и OAuth без статического API-ключа. По инструкции этот же плагин не дублировался отдельной установкой MCP/skills для Codex.

Кроме того, стандартный init обнаружил antigravity, gemini-cli и github-copilot и установил семь user-level навыков: neon, neon-postgres, neon-auth, neon-functions, neon-object-storage, neon-ai-gateway, neon-realtime. Добавлена MCP-конфигурация Neon в ~/.gemini/config/mcp_config.json, ~/.gemini/settings.json и ~/.copilot/mcp-config.json. GitHub Copilot CLI не был найден, его плагин не установлен; CLI использовал skills/MCP fallback. Сам Copilot дополнительно не устанавливался.

neon skills status --global показал up to date у всех семи навыков. neon skills status сообщил, что project-level skills-lock.json отсутствует; доступные глобальные навыки/плагин используются и для этого проекта. Отдельные project-level копии не создавались. MCP определение установлено и проверено как файл; отдельная OAuth-сессия MCP в этом чате не проверялась, работа выполнена предпочтительным по skill CLI. Никакие старые настройки вручную не удалялись и не заменялись собственным конфигом.

## Изменения проекта

| Файл | Изменение |
|---|---|
| neon.ts | Сгенерирован Postgres-only конфиг; комментарии переведены на русский без изменения политики существующей production |
| package.json/package-lock.json | Зафиксированы @neon/config 1.14.0 и @neon/env 2.1.3; root override minimatch 11.0.1 устранил четыре умеренных замечания старых инструментов линтера без force-fix/смены основной версии |
| .gitignore | Исключены .env.local и .neon; прежние правила сохранены |
| .env, игнорируется | CLI обновил DATABASE_URL и добавил DATABASE_URL_UNPOOLED, NEON_BRANCH, NEON_BRANCH_ID, NEON_FUNCTION_HOST_SUFFIX. До команды сделана резервная копия в .tools/neon-backup. Проверено: все прежние переменные вне Neon, включая локальный TEST_DATABASE_URL и SECRET_KEY, сохранены |
| app/config.py | Чтение .env и .env.local; PostgreSQL URL CLI нормализуется для psycopg3 с сохранением пароля и TLS-параметров; отдельный migration_url |
| migrations/env.py и tools/apply_pending.py | Миграции используют прямое соединение, API — pooled; при локальной настройке без UNPOOLED поведение прежнее |
| tests/conftest.py | Во время тестовых миграций оба URL явно перенаправлены в booknest_test, затем окружение восстанавливается. Production direct URL не может случайно попасть в fixture |
| tests/test_neon_config.py | Регрессии драйвера/экранированного пароля/TLS и локального fallback |
| tools/create_demo_users.py | Отдельный BOOKNEST_DEMO_ACCOUNTS_FILE для облачных ролей; локальный .tools/demo-accounts.json не менялся |
| react-app/e2e/booknest.spec.ts | Выбор файла учетных записей и диагностического скриншота из окружения; явное ожидание реального PATCH при сохранении и возврате вместо гонки с UI |
| tools/check_neon.py | Проверяет pooled/direct подключения, клиентский TLS, ревизию, количества и HTTP; сохраняет только обезличенный JSON |

Исходники frontend не получают DATABASE_URL: переменные подключения не имеют VITE_-префикса. Дополнительный JavaScript-драйвер БД в React не устанавливался, поскольку сервер написан на Python и уже использует SQLAlchemy/psycopg. pool_pre_ping уже был включен и сохранен.

## Схема и данные

До миграций чтением проверена пустая public-схема Neon. Применены только существующие ревизии Alembic до 005_wishlist; новые миграции не создавались, таблицы не пересоздавались. Для пустого каталога запущен существующий guarded seed: 30 учебных книг, 5 авторов, 5 жанров, 10 неактивных читателей, 20 выдач. Затем созданы две новые роли в этой базе, их случайные пароли сохранены только в .tools/neon-demo-accounts.json.

Локальный кластер и его данные не переносились в Neon. Записи 31/32 в облаке — новые объекты e2e, обе мягко скрыты; успешная тестовая выдача возвращена. Первая прерванная проверка успела сохранить отредактированную книгу31, но не выдать ее. Она скрыта через API только после точного совпадения тестового названия. Итог Neon: 32 записи книг, 30 активных, 12 пользователей, 21 запись истории выдач. Это не удаление исходных данных.

## Доказательства работоспособности

Команды выполнены из корня. Приведены реальные итоговые строки:

    npm run build
    ✓ 164 modules transformed.
    ✓ built in 253ms

    python -m pytest -q --cov=app --cov-report=term-missing
    51 passed, 1 warning in 12.93s
    TOTAL 1081 statements, 76 missed, 93%

    npm test
    Test Files 4 passed (4)
    Tests 5 passed (5)

    npm run lint
    eslint . — exit 0

    npm audit
    found 0 vulnerabilities

    python -m ruff check app tests migrations examples
    All checks passed!

Запущены отдельные процессы: FastAPI 127.0.0.1:8002 и Vite 127.0.0.1:5176 с VITE_API_TARGET=http://127.0.0.1:8002. Это локальные адреса, не публичный deploy. CORS нового процесса содержит этот origin, конфигурация в Git не ослаблялась.

Playwright использовал настоящий frontend и FastAPI с Neon. Пройдены вход библиотекаря, создание книги, сохранение/чтение полей, редактирование, выдача, возврат, мягкое удаление только своей книги и выход:

    1 passed (42.3s)
    scenario duration 40.9s

Первый запуск упал на старом 5-секундном ожидании UI после сохранения: PATCH занял около4с, последующий GET около2с. Ошибка не скрывалась повтором без изменения: теперь ожидается успешный реальный ответ PATCH, и отдельно завершение возврата. Статусы и таймауты запросов не подменялись, сеть не мокировалась.

verification.json подтверждает psycopg, client_tls=true для pooled/direct, 005_wishlist, HTTP200 каталога/SPA/health и total30. Проверка TLS взята у клиентского libpq; pg_stat_ssl на внутреннем сервере за прокси вернул false и не использовался как доказательство шифрования внешнего соединения.

## Повтор запуска и границы

.env уже указывает на Neon; .env.local при наличии имеет более высокий приоритет. Перед возвратом к локальной БД нужно восстановить исходный DATABASE_URL из сохраненной резервной копии и убрать/переопределить DATABASE_URL_UNPOOLED; не запускать seed/restore повторно. Для миграций: python -m tools.apply_pending (проверяет текущую ревизию). Для API: python -m uvicorn app.main:app --host 127.0.0.1 --port 8002. Для клиента нужен VITE_API_TARGET=http://127.0.0.1:8002 и порт5176. Реальные пароли/строки подключения в команды не вставляются.

Для e2e: PLAYWRIGHT_BASE_URL=http://127.0.0.1:5176, PLAYWRIGHT_CHANNEL=msedge, BOOKNEST_DEMO_ACCOUNTS_FILE=<абсолютный путь к .tools/neon-demo-accounts.json>, BOOKNEST_E2E_SCREENSHOT=../.tools/neon-e2e/fullstack-success.png; затем npm --prefix react-app run test:e2e. Скриншоты диагностические и не заменяют финальные иллюстрации отчетов.

Публичный Render, отдельный production SECRET_KEY для публичного сервера, внешний мониторинг и эксплуатационная приемка HTTPS остаются следующими действиями. Текущий SECRET_KEY сохранен ради прежней локальной конфигурации; он не объявляется новым production-ключом. Необходимые для этого подключения секреты в Git не попадают. PR не объединялись, push в этом подэтапе не выполнялся.
