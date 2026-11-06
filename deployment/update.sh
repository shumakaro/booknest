#!/bin/sh
set -eu
# Скрипт запускается из существующего checkout; локальные правки не сбрасываются.
git diff --quiet && git diff --cached --quiet || { echo 'Есть незакоммиченные изменения; обновление остановлено' >&2; exit 1; }
sh deployment/backup.sh
if [ "$#" -eq 1 ]; then
    tag=$1
    printf '%s' "$tag" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+$' || { echo 'Неверный тег' >&2; exit 1; }
    git fetch origin "refs/tags/$tag:refs/tags/$tag"
    git switch --detach "$tag"
else
    git pull --ff-only
fi
docker compose --project-name "${COMPOSE_PROJECT_NAME:-booknest}" --env-file "${COMPOSE_ENV_FILE:-.env.production}" -f docker-compose.yml -f docker-compose.production.yml up -d --build --wait
docker compose --project-name "${COMPOSE_PROJECT_NAME:-booknest}" --env-file "${COMPOSE_ENV_FILE:-.env.production}" -f docker-compose.yml ps
echo 'Обновление контейнеров завершено. Публичный HTTPS и основной сценарий проверяются отдельно.'
