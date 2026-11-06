# Проверка ЛР №9

Фактически выполненные команды и результаты:

- `python -m pytest -q`: 46 passed, 1 warning in 13.05s. Предупреждение относится к устаревающему BlockingPortal в Starlette/AnyIO.
- `python -m ruff check app tests migrations examples`: All checks passed.
- `npm --prefix react-app run build`: успешная production-сборка.
- `node tools/check_auth_browser.cjs`: Browser: login, librarian controls, session restore, logout: OK.
- `git log --all --format=... -- .env`: вывод пустой, файл .env в коммитах не найден.

Проверки не включали публичный HTTPS, внешний vuln-lab или проект однокурсника. Настоящий скриншот браузера: login-success.png. Входной пароль в журнал не выводился.
