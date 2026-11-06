"""Формирует проверяемые ссылки на строки кода для 15 пунктов аудита."""
from pathlib import Path
items=[
('Хеширование паролей','app/core/security.py','def hash_password','Реализовано; bcrypt через passlib, исходный пароль не хранится.'),
('Секреты вне репозитория','.gitignore','.env','Проверено: git log --all -- .env не вернул коммитов; .env и .tools исключены.'),
('Срок жизни токена','app/services/auth.py','lifetime =','Access 15 минут по умолчанию; refresh не более 7 дней. Истёкший токен проверен тестом.'),
('Нет чувствительных данных в payload','app/core/security.py','payload =','Ровно sub, role, iat, exp, type; подпись HS256.'),
('Выходные схемы','app/schemas/auth.py','class UserRead','Хеш отсутствует в схеме; проверен ответ регистрации и /me.'),
('Проверка владельца','app/core/auth.py','def get_own_loan','Существующий посторонний пользователь получает 404 при чтении и возврате.'),
('Роли на изменениях','app/routers/catalog_db.py','user: Librarian','18 комбинаций роли и операций книг/авторов проверены тестами.'),
('Защита от XSS','react-app/src/pages/login/LoginPage.tsx','role="alert"','Строки выводятся JSX; dangerouslySetInnerHTML в src отсутствует. Нужна повторная проверка после интеграции всех страниц.'),
('Параметризованные запросы','app/repositories/catalog.py','autoescape=True','ORM и text с именованными параметрами; SQL-инъекция в поиске не возвращает посторонние строки.'),
('Явные CORS origins','app/config.py','def explicit_origins','Wildcard запрещён валидатором; чужой preflight и cookie-origin отклонены.'),
('Единая ошибка входа','app/services/auth.py','Неверный e-mail или пароль','Одинаковый 401 для отсутствующей записи и неверного пароля; используется dummy hash.'),
('Серверная валидация','app/schemas/auth.py','def strong_password','Проверяются буквы, цифры, длина и предел bcrypt 72 байта, роль не принимается регистрацией.'),
('Нет внутренних ошибок в ответах','app/core/http.py','async def unexpected_error','Клиент получает нейтральное сообщение; подробности остаются в серверном логе.'),
('HTTPS в развёртывании','docs/lab9/report.md','## 7','Пока не подтверждено: локальная разработка HTTP. Конфигурация HTTPS подготовлена в ЛР №12; VPS и домена нет.'),
('Ограничение /token','app/routers/auth.py','async def limit_login','5 попыток за 300 секунд на адрес, затем 429. Проверено тестом; ограничитель локален для процесса.')]
lines=['# Проверка безопасности BookNest','', 'Статусы актуализированы для lab-12/deployment. Логи не содержат access/refresh; временный код подтверждения e-mail намеренно выводится только в учебную консоль. Подтверждение отмечает email_verified и не блокирует основной учебный вход.','', '| № | Проверка | Строка кода | Результат |','|---|---|---|---|']
for number,(title,path,needle,status) in enumerate(items,1):
    source=Path(path).read_text(encoding='utf-8-sig').splitlines()
    matches=[i for i,line in enumerate(source,1) if needle in line]
    assert matches,(path,needle)
    line=matches[0]
    lines.append(f'| {number} | {title} | [{path}:{line}](../{path}#L{line}) | {status} |')
lines+=['','## Практика 12','Реально проверены подделка роли в JWT (401), истёкший JWT (401), refresh вместо access (401), IDOR существующего чужого пользователя (404), CORS и инъекционная строка поиска. Стенд преподавателя vuln-lab не предоставлен, поэтому воспроизведение его исходных уязвимостей и их исправление не заявляется. Ревью чужого проекта не проводилось: проекта и согласованного участника нет.','', '## Ограничения','Демо-cookie без Secure допустима только на локальном HTTP. Для эксплуатации требуется COOKIE_SECURE=true и проверенный HTTPS. Ограничители в памяти рассчитаны на один процесс; для нескольких экземпляров нужен общий счётчик. Секреты реального сервера не создаются в Git.']
Path('docs/security-review.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
