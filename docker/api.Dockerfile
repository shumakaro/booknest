# Зависимости собираются отдельно: изменение исходников не отменяет кэш установки.
FROM python:3.12-alpine AS dependencies
WORKDIR /build
COPY requirements-runtime.txt requirements-lock.txt ./
RUN pip install --no-cache-dir --no-compile --prefix=/install -r requirements-runtime.txt -c requirements-lock.txt

FROM python:3.12-alpine AS runtime
RUN apk add --no-cache libstdc++
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY --from=dependencies /install /usr/local
COPY app ./app
COPY migrations ./migrations
COPY alembic.ini ./
COPY tools/seed.py tools/create_demo_users.py tools/apply_pending.py ./tools/
COPY docker/entrypoint.sh ./docker/entrypoint.sh
RUN adduser -D appuser && mkdir -p /app/.tools && chown -R appuser /app
USER appuser
EXPOSE 8000
ENTRYPOINT ["sh", "/app/docker/entrypoint.sh"]
CMD []

# Профиль тестов добавляет инструменты только в свой образ, не в production.
FROM runtime AS test
USER root
COPY requirements-lock.txt ./
RUN pip install --no-cache-dir -r requirements-lock.txt
COPY tests ./tests
COPY tools/refresh_demo_catalog.py ./tools/refresh_demo_catalog.py
COPY tools/generate_api_types.py tools/measure_orm.py tools/check_orm_metadata.py ./tools/
# Защитные тесты аудита Neon запускаются без сети, но импортируют сам проверяемый модуль.
COPY tools/audit_neon.py ./tools/audit_neon.py
COPY tools/backup_neon.py ./tools/backup_neon.py
COPY docs/api/openapi.json ./docs/api/openapi.json
COPY react-app/src/api/generated.ts ./react-app/src/api/generated.ts
COPY examples ./examples
COPY pyproject.toml ./
RUN chown -R appuser /app
USER appuser
CMD ["python", "-m", "pytest", "-q", "--junitxml=/app/.tools/container-tests.xml"]
