#!/bin/sh
set -eu
[ "$#" -eq 2 ] || { echo 'Использование: restore.sh dump-file new_name_restore_test' >&2; exit 1; }
dump_file=$1
target=$2
# Только новая тестовая БД, никогда не рабочая. Проверка также исключает SQL-инъекцию в имя.
printf '%s' "$target" | grep -Eq '^[a-z][a-z0-9_]{0,40}_restore_test$' || { echo 'Нужно имя с суффиксом _restore_test' >&2; exit 1; }
[ -f "$dump_file" ] && [ -f "$dump_file.counts" ] && [ -f "$dump_file.sha256" ] || { echo 'Нет полного комплекта резервной копии' >&2; exit 1; }
expected_hash=$(cut -d ' ' -f 1 "$dump_file.sha256")
actual_hash=$(sha256sum "$dump_file" | cut -d ' ' -f 1)
[ "$expected_hash" = "$actual_hash" ] || { echo 'Контрольная сумма не совпала' >&2; exit 1; }
compose() {
    docker compose --project-name "${COMPOSE_PROJECT_NAME:-booknest}" --env-file "${COMPOSE_ENV_FILE:-.env.production}" -f docker-compose.yml "$@"
}
# Список БД читается без вставки пользовательского значения в SQL.
databases=$(compose exec -T db sh -c 'exec psql -U "$POSTGRES_USER" -d postgres -At -c "SELECT datname FROM pg_database"')
if printf '%s\n' "$databases" | grep -Fx "$target" >/dev/null; then
    echo 'Целевая БД уже существует; восстановление остановлено без изменений' >&2
    exit 1
fi
compose exec -T db sh -c 'exec createdb -U "$POSTGRES_USER" "$1"' sh "$target"
compose exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" exec pg_restore -U "$POSTGRES_USER" --no-owner --no-privileges -d "$1"' sh "$target" < "$dump_file"
actual=$(compose exec -T db sh -c 'exec psql -U "$POSTGRES_USER" -d "$1" -At -c "SELECT (SELECT count(*) FROM books),(SELECT count(*) FROM loans);"' sh "$target")
expected=$(cat "$dump_file.counts")
[ "$actual" = "$expected" ] || { echo 'Число записей после восстановления не совпало' >&2; exit 1; }
echo "Восстановление в новую тестовую БД проверено: $actual"
