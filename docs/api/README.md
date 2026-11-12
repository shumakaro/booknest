# Актуальный контракт BookNest

`openapi.json` — текущий снимок `app.main.create_app().openapi()`. Старые файлы `docs/lab7/openapi.json` и `docs/improvements/stage*-openapi.json` остаются историческими снимками своих этапов. По умолчанию генератор больше не берет старую ЛР7.

Из корня проекта с настроенным окружением:

```powershell
.venv/Scripts/python.exe -X utf8 -c "import json; from pathlib import Path; from app.main import create_app; Path('docs/api/openapi.json').write_text(json.dumps(create_app().openapi(), ensure_ascii=False, indent=2)+'\n', encoding='utf-8')"
.venv/Scripts/python.exe tools/generate_api_types.py
.venv/Scripts/python.exe tools/generate_api_types.py --check
```

Генератор не подключается к БД и не выводит переменные окружения. `--check` проверяет файл без записи и завершает работу с ненулевым кодом при расхождении. `--schema` и `--output` позволяют явно выбрать снимок и выходной файл; старые учебные примеры не требуется перезаписывать.

Pytest проверяет одновременно живую схему приложения, актуальный снимок и сгенерированные TypeScript-типы. Генератор покрывает используемые схемы моделей, включая const/enum, nullable union, ссылки и массивы; он не является полным OpenAPI SDK и не генерирует HTTP-клиент или ограничения времени выполнения TypeScript.

В PATCH отсутствие поля сохраняет значение. Явный null разрешен только для ISBN книги и года рождения автора; остальные поля при null получают 422. Этот смысл уже существовал в валидаторах и теперь корректно описан в OpenAPI. Пустой PATCH остается совместимым. Запрос возврата принимает state="returned", а не произвольную строку.

Ошибки собственного API используют code/message/details/request_id. Details — null либо список безопасных loc/msg/type, без input/ctx. Идентификатор совпадает с X-Request-ID; сохраняются WWW-Authenticate, Allow и Retry-After, когда их задает соответствующий ответ. У 204 отсутствует тело. CORS preflight и ответы внешнего прокси рассматриваются отдельно от схем JSON собственного API.

Выход допускает отсутствие access: сервер может отозвать refresh из cookie, повторный выход без токенов тоже идемпотентен. В OpenAPI для logout добавлена пустая security-альтернатива, /auth/me по-прежнему требует Bearer. Видимость/роль проверяется роутерами независимо от того, что описано в Swagger. Перечень операций и успешных ответов приведен в ROUTES.md.
