# React собирается заранее; Node не нужен в работающем Python-контейнере.
FROM node:24-alpine AS frontend
WORKDIR /frontend
COPY react-app/package.json react-app/package-lock.json ./
RUN npm ci
COPY react-app/ ./
RUN npm run build

# Сохраняются закрепленные зависимости и существующие миграции ЛР8–12.
FROM python:3.12-alpine AS dependencies
WORKDIR /build
COPY requirements-runtime.txt requirements-lock.txt ./
RUN pip install --no-cache-dir --no-compile --prefix=/install -r requirements-runtime.txt -c requirements-lock.txt

FROM python:3.12-alpine AS runtime
RUN apk add --no-cache libstdc++ && adduser -D appuser
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 STATIC_DIR=/app/static
WORKDIR /app
COPY --from=dependencies /install /usr/local
COPY app ./app
COPY migrations ./migrations
COPY alembic.ini ./
COPY tools/apply_pending.py ./tools/apply_pending.py
COPY docker/render-entrypoint.sh ./docker/render-entrypoint.sh
COPY --from=frontend /frontend/dist ./static
USER appuser
EXPOSE 10000
ENTRYPOINT ["sh", "/app/docker/render-entrypoint.sh"]
