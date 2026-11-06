#!/bin/sh
set -eu
# Команда seed/test передаётся явно; обычный API сначала проверяет новые ревизии.
if [ "$#" -gt 0 ]; then
    exec "$@"
fi
python -m tools.apply_pending
exec uvicorn app.main:app --host 0.0.0.0 --port "${API_PORT:-8000}" --proxy-headers --forwarded-allow-ips "${FORWARDED_ALLOW_IPS:-127.0.0.1}"
