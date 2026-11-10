#!/bin/sh
set -eu
# Повторное наполнение отсутствует: применяются только еще не выполненные миграции.
python -m tools.apply_pending
# Render передает PORT. Сигналы завершения получает сам uvicorn благодаря exec.
# Заголовки произвольного прокси не используются для подмены клиентского IP.
exec uvicorn app.render:create_render_app --factory --host 0.0.0.0 --port "${PORT:-10000}" --no-proxy-headers
