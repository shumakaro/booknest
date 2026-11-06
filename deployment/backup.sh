#!/bin/sh
set -eu
# Файл окружения передаётся Compose, а не выполняется как shell-код.
compose() {
    docker compose --project-name "${COMPOSE_PROJECT_NAME:-booknest}" --env-file "${COMPOSE_ENV_FILE:-.env.production}" -f docker-compose.yml "$@"
}
backup_dir=${BACKUP_DIR:-/var/backups/booknest}
umask 077
mkdir -p "$backup_dir"
backup_file="$backup_dir/booknest-$(date -u +%Y%m%dT%H%M%SZ).dump"
if [ -e "$backup_file" ]; then
    echo 'Файл с такой меткой времени уже существует; перезапись запрещена' >&2
    exit 1
fi
# Пароль доступен только внутри уже запущенного контейнера, в argv он не раскрывается.
compose exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$backup_file"
compose exec -T db sh -c 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "SELECT (SELECT count(*) FROM books),(SELECT count(*) FROM loans);"' > "$backup_file.counts"
sha256sum "$backup_file" > "$backup_file.sha256"
echo "Резервная копия создана: $backup_file"
# По умолчанию старые копии не удаляются. Очистка включается владельцем явно.
if [ "${BACKUP_PRUNE:-0}" = 1 ]; then
    case "${BACKUP_RETENTION_DAYS:-7}" in *[!0-9]*|'') echo 'Неверный срок хранения' >&2; exit 1;; esac
    [ "${BACKUP_RETENTION_DAYS:-7}" -ge 1 ] || exit 1
    find "$backup_dir" -maxdepth 1 -type f -name 'booknest-*.dump*' -mtime "+${BACKUP_RETENTION_DAYS:-7}" -delete
fi
