# Развёртывание и эксплуатация BookNest

## Фактический статус
VPS, домен и согласованный внешний адрес отсутствуют. Команды ниже подготовлены для нового Ubuntu-сервера и в этой сессии на сервере не выполнялись. Локальные PostgreSQL-данные, история Git и миграции не пересоздавались. Существующие PR не объединялись. Публичный HTTPS и действительный сертификат пока не подтверждены.

## Подготовка сервера
Понадобятся VPS с SSH-ключом, доменом и DNS A/AAAA на сервер, Docker Engine/Compose, Nginx, certbot и место для дампов. Установка Docker выполняется по [официальной инструкции Ubuntu](https://docs.docker.com/engine/install/ubuntu/); самостоятельная установка WSL/Docker на ноутбук не проводилась.

На новом Ubuntu-сервере обновляются пакеты, устанавливаются nginx, certbot, git и ufw. Создаётся отдельный пользователь deploy. Публичный SSH-ключ добавляется в его authorized_keys с правами 700 на .ssh и 600 на файл. Перед отключением парольного входа необходимо проверить второе SSH-подключение по ключу, оставив исходную сессию открытой.

В отдельном sshd_config.d/booknest.conf задаются `PermitRootLogin no` и `PasswordAuthentication no`. Перед reload выполняется `sudo sshd -t`. Firewall: `sudo ufw allow 22/tcp`, затем 80/tcp и 443/tcp, после проверки SSH — `sudo ufw enable`. БД и API не имеют published ports, а web привязан к 127.0.0.1:8080; наружу обращается только системный Nginx.

## Репозиторий и окружение
Репозиторий клонируется в /srv/booknest. Для эксплуатации используется отдельный файл .env.production на основе deployment/env.production.example с правами 600. Требуются POSTGRES_DB, POSTGRES_USER, случайный URL-safe POSTGRES_PASSWORD, новый SECRET_KEY, DOMAIN и WEB_PORT. Эксплуатационный SECRET_KEY должен отличаться от разработки. .env.production и дампы не добавляются в Git.

Пример генерации независимых значений: `python3 -c "import secrets; print(secrets.token_hex(32))"`. Вывод сохраняется только владельцем сервера в защищённый файл и не публикуется. Внешняя точка входа использует COOKIE_SECURE=true и явный HTTPS-origin.

## Первый запуск
Из /srv/booknest выполняется:

`docker compose --project-name booknest --env-file .env.production -f docker-compose.yml -f docker-compose.production.yml up -d --build --wait`

Проверяются `ps`, `logs api`, `logs seed` и `curl --fail http://127.0.0.1:8080/health`. Перед стартом API применяются только недостающие ревизии. На пустом каталоге seed добавляет демонстрационные данные и две отсутствующие роли; непустой каталог и старые пароли не заменяются. Данные ролей находятся в .tools/demo-accounts.json внутри защищённого тома API. Их передача проверяющему выполняется после готовности HTTPS отдельно, а не публикацией случайного пароля в репозитории.

## Сертификат и HTTPS
Сначала создаётся /var/www/certbot и временный HTTP-конфиг:

`python3 tools/render_nginx.py --domain <домен> --upstream-port 8080 --bootstrap --output /tmp/booknest-bootstrap.conf`

После проверки конфиг устанавливается в sites-available/sites-enabled; выполняются `sudo nginx -t` и `sudo systemctl reload nginx`. Не следует использовать случайный домен из примера как настоящий.

Сертификат запрашивается командой `sudo certbot certonly --webroot -w /var/www/certbot -d <домен>`. Для этого DNS уже должен указывать на сервер, а порт 80 быть доступен. Затем генерируется окончательный конфиг без --bootstrap, снова выполняются nginx -t и reload. В нём HTTP перенаправляется на HTTPS, включены HSTS, nosniff, Referrer-Policy и базовый CSP.

Проверки: `curl -I http://<домен>` должен показать redirect, `curl --fail https://<домен>/health` — рабочий ответ. Сертификат проверяется браузером и `openssl s_client -connect <домен>:443 -servername <домен>`. Продление: `sudo systemctl enable --now certbot.timer`, затем `sudo certbot renew --dry-run`. Успех этих команд в данной сессии не заявляется.

## Повторное развёртывание
Перед обновлением проверяются резервная копия и чистота checkout. `COMPOSE_ENV_FILE=.env.production sh deployment/update.sh` выполняет backup, git pull --ff-only, сборку и up --wait. Ни reset, ни force push, ни удаление томов не используются. После обновления снова проверяются публичный HTTPS, вход обеих ролей, создание/редактирование, выдача, конфликт 409, возврат и прямая ссылка SPA.

Для утверждённого тега вызывается `sh deployment/update.sh v1.0.0`: тег проверяется, получается обычным fetch и checkout переводится в detached HEAD без переписывания истории. После такого запуска следующий выпуск также задаётся тегом; git pull без аргумента предназначен для веточного checkout.

## Резервное копирование и восстановление
`COMPOSE_ENV_FILE=.env.production BACKUP_DIR=/var/backups/booknest sh deployment/backup.sh` создаёт custom-format dump, контрольную сумму и отдельный файл количества books/loans. Права ограничиваются umask 077, действующий пароль не попадает в командную строку. По умолчанию старые копии не удаляются. Владелец может явно включить BACKUP_PRUNE=1 и срок BACKUP_RETENTION_DAYS; очищаются только старые booknest-*.dump* в указанном каталоге.

Проверка восстановления выполняется только в новой БД: `COMPOSE_ENV_FILE=.env.production sh deployment/restore.sh <dump-file> booknest_check_restore_test`. Имена ограничены суффиксом _restore_test. Существующая целевая БД вызывает отказ без удаления/перезаписи. Проверяются SHA-256 и число книг/выдач. В рабочую БД скрипт не восстанавливает; аварийное переключение требует отдельного решения владельца.

В ЛР №8 дамп уже был реально восстановлен в отдельную локальную БД с подтверждёнными 30 книгами и 20 выдачами. Новые shell-скрипты проверяются отдельно в CI, а не объявляются испытанными на VPS.

## Ежедневная копия
Файлы deployment/booknest-backup.service и .timer предназначены для установки в /etc/systemd/system после проверки путей. Timer запускается в 03:00 UTC, то есть 08:00 Asia/Qyzylorda, и имеет Persistent=true. После установки выполняются daemon-reload, enable --now booknest-backup.timer и list-timers. Фактический таймер в этой сессии не установлен: сервера нет. Полезно хранить дополнительную копию вне VPS; учётные данные внешнего хранилища в проект не добавляются.

## CI deploy с ручным подтверждением
Workflow Deploy approved release tag запускается вручную для существующего тега и требует approved=true. Проверяется успешный CI jobs checks/containers именно для коммита тега. Затем используется SSH с закреплённым host key и StrictHostKeyChecking=yes. В GitHub Environment production владелец должен включить required reviewer как дополнительное подтверждение.

Требуются secrets DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH, DEPLOY_SSH_KEY, DEPLOY_KNOWN_HOSTS. Они не созданы и не запрошены в чате, так как VPS нет. Workflow не исполняет SSH при обычном PR. Публикация образов в GHCR настроена отдельно по тегу v*, но теги в этой работе не создавались.

## Первые команды при недоступности
1. `docker compose --env-file .env.production ps` — состояние контейнеров.
2. `docker compose --env-file .env.production logs --tail=100 api web db` — причина и request_id.
3. `sudo nginx -t` и `sudo journalctl -u nginx -n 50` — внешний вход.

Далее проверяются DNS, curl к loopback web, certbot certificates, свободное место (`df -h`), pg_isready, версия Alembic и журнал миграции. Нельзя лечить ошибку удалением тома. При 500 пользователь получает нейтральное сообщение и request_id; по нему ищется серверная запись.

## Публичная приёмка
После предоставления сервера нужно сохранить настоящие подтверждения: адрес, redirect, действительный сертификат, продление, вход двух ролей, полный сценарий, повторное развёртывание, восстановление дампа, Lighthouse mobile и внешний сканер заголовков. Внешний uptime-сервис выбирается и подключается владельцем; аккаунт и история наблюдений не выдумываются.
