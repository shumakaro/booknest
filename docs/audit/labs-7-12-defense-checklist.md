# Проверка сборника защиты ЛР7-12

Дата: 2026-11-14. Ветка codex/lab-defense-questions. Основание c6cd382.

Всего 37 вопросов: 1 прямой вопрос методички, 30 прежних авторских и 6 дополнительных.
Исходная нумерация официальному вопросу не приписана. Технический ID L12-O01 создан для учета.
Все шесть разделов демонстрации сохранены дословно; их формулировки не объявлены списком контрольных вопросов.

| ID | Вопрос | Источник | Код или подтверждение | Статус |
| --- | --- | --- | --- | --- |
| L7-A01 | Почему data в PATCH не содержит все поля формы | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab7.txt | app/routers/catalog_db.py:79 | CONTENT_VERIFIED |
| L7-A02 | Почему повторный ISBN является конфликтом | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab7.txt | app/services/catalog.py:31 | CONTENT_VERIFIED |
| L7-A03 | Как различаются 404 и пустой список | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab7.txt | app/routers/catalog_db.py:67 | CONTENT_VERIFIED |
| L7-A04 | Почему пример хранилища в памяти не подходит для Render | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab7.txt | app/repositories/memory.py:7 | CONTENT_VERIFIED |
| L7-A05 | Как связываются ошибка клиента и журнал сервера | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab7.txt | app/core/http.py:44 | CONTENT_VERIFIED |
| L8-A01 | Почему SQL и ORM не являются двумя разными базами | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab8.txt | app/models.py:48 | CONTENT_VERIFIED |
| L8-A02 | Как исключена двойная выдача последнего экземпляра | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab8.txt | app/services/catalog.py:82 | CONTENT_VERIFIED |
| L8-A03 | Почему индекс не гарантирует ускорение любого запроса | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab8.txt | db/benchmark.sql:1 | CONTENT_VERIFIED |
| L8-A04 | Почему 30 книг не ограничивают поиск | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab8.txt | app/repositories/catalog.py:61 | CONTENT_VERIFIED |
| L8-A05 | Зачем нужны разные подключения Neon | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab8.txt | app/db.py:11 | CONTENT_VERIFIED |
| L9-A01 | Почему 404 возвращается для чужой выдачи | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab9.txt | app/core/auth.py:45 | CONTENT_VERIFIED |
| L9-A02 | Почему JWT нельзя исправить заменой роли в payload | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab9.txt | app/core/security.py:41 | CONTENT_VERIFIED |
| L9-A03 | Зачем logout при коротком access | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab9.txt | app/services/auth.py:74 | CONTENT_VERIFIED |
| L9-A04 | Почему localStorage не используется для access | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab9.txt | react-app/src/api/client.ts:20 | CONTENT_VERIFIED |
| L9-A05 | Почему действительный сертификат не является полным аудитом | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab9.txt | docs/security-review.md:1 | CONTENT_VERIFIED |
| L10-A01 | Почему total не равен размеру текущей страницы | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab10.txt | app/repositories/catalog.py:61 | CONTENT_VERIFIED |
| L10-A02 | Почему поздний ответ поиска опасен | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab10.txt | react-app/src/features/books/hooks/useGlobalBooks.ts:16 | CONTENT_VERIFIED |
| L10-A03 | Как проверяется оптимистичное действие | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab10.txt | react-app/src/tests/Wishlist.test.tsx:1 | CONTENT_VERIFIED |
| L10-A04 | Почему локальный и глобальный ID не смешиваются | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab10.txt | app/services/import_book.py:22 | CONTENT_VERIFIED |
| L10-A05 | Что именно означает покрытие 93 процента | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab10.txt | docs/audit/final-ci-20261114.json:1 | CONTENT_VERIFIED |
| L11-A01 | Почему localhost не подходит для связи с БД другого контейнера | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab11.txt | docker-compose.yml:1 | CONTENT_VERIFIED |
| L11-A02 | Почему depends_on без проверки здоровья недостаточен | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab11.txt | docker-compose.yml:1 | CONTENT_VERIFIED |
| L11-A03 | Почему исходники тестов отсутствуют в runtime образе | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab11.txt | docker/api.Dockerfile:1 | CONTENT_VERIFIED |
| L11-A04 | Как доказана сохранность данных | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab11.txt | .github/workflows/ci.yml:1 | CONTENT_VERIFIED |
| L11-A05 | Почему нельзя выполнять down с удалением томов на рабочем проекте | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab11.txt | docker-compose.yml:1 | CONTENT_VERIFIED |
| L12-O01 | приложение недоступно — ваши первые три команды? | docs/course/lab12.txt | docs/deployment.md:1 | CONTENT_VERIFIED |
| L12-A01 | Почему выбраны Render и Neon | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab12.txt | docker/render.Dockerfile:1 | CONTENT_VERIFIED |
| L12-A02 | Как проверена пригодность резервной копии | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab12.txt | tools/backup_neon.py:116 | CONTENT_VERIFIED |
| L12-A03 | Почему pg_dump17 был заменен | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab12.txt | tools/backup_neon.py:116 | CONTENT_VERIFIED |
| L12-A04 | Как различаются обновление данных и развертывание кода | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab12.txt | docs/deployment.md:1 | CONTENT_VERIFIED |
| L12-A05 | Почему собственная проверка не закрывает практику15 | tools/build_detailed_reports.py LABS.qa; сверка docs/course/lab12.txt | docs/audit/stages-progress.md:1 | CONTENT_VERIFIED |
| L7-X01 | Зачем response_model, если функция уже возвращает словарь? | Авторский дополнительный; ЛР7 | app/schemas/auth.py:27 | CONTENT_VERIFIED |
| L8-X01 | Как обнаруживается и устраняется N+1 в BookNest? | Авторский дополнительный; ЛР8 | app/repositories/catalog.py:24 | CONTENT_VERIFIED |
| L9-X01 | Почему пароль хешируется, а не просто кодируется в Base64? | Авторский дополнительный; ЛР9 | app/core/security.py:16 | CONTENT_VERIFIED |
| L10-X01 | Как пользователь получает понятную ошибку вместо внутреннего исключения? | Авторский дополнительный; ЛР10 | react-app/src/api/client.ts:51 | CONTENT_VERIFIED |
| L11-X01 | Почему прямая ссылка React должна работать после перезагрузки страницы? | Авторский дополнительный; ЛР11 | app/render.py:35 | CONTENT_VERIFIED |
| L12-X01 | Что означает успешный /health и чего он не гарантирует? | Авторский дополнительный; ЛР12 | app/main.py:1 | CONTENT_VERIFIED |

## Источники и ограничения

- Веблекц.odt содержит контрольные вопросы лекций, а не отдельный список защиты ЛР.
- Вебпр.odt не содержит отдельного списка вопросов защиты ЛР7-12.
- Сведения о CI и восстановлении являются сохраненными подтверждениями; новый запуск приложения не заявляется.
- Визуальная приемка DOCX фиксируется отдельно в docs/audit/defense-docx-qa.md.
- CONTENT_VERIFIED означает сверку содержания и существования ссылок; это не общий статус завершения этапа.
