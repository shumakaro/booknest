## Лекция 9 — продолжение 14 ноября 2026

Ветка codex/lecture-09-materials от 605d0d5, после опубликованной лекции 8.
Подготовлены 10 ответов с 26 реальными ссылками на код; старые ответы сохранены,
значения лекций 8 и 10–15 не изменены. Эти материалы войдут в общий отчет позже.

docs/api-design.md дополнен до всех 30 операций/22 путей: ресурсы, права,
коды, три полных пары примеров, фильтры/пагинация, локальный и внешний поиск.
Шесть тел примеров проверены схемами. Исправлены только метаданные OpenAPI:
на трех маршрутах discover добавлены уже существующие ошибки 502/503/504
и описание Retry-After для 503. Поведение сервиса и пользовательские данные не изменены.

Настоящий регрессионный прогон до исправления: 7 failed, 37 passed;
после: 44 passed, 1 deselected, 1 warning (anyio уже импортирован TestClient).
Отдельно 11 HTTP-сценариев API в памяти. Один DB-тест исключен намеренно;
Engine.connect запрещен на весь прогон, попыток подключения 0.
Первый запуск в ограниченной среде прерван без результата; исходная проверка
до добавления регрессии дала 27 passed. Все успешные результаты получены повтором
в доступной среде, без изменения env-файлов или подключения к Neon.

Протоколы: docs/lectures/lecture-09-validation.json, lecture-09-contract-before.json,
docs/test-results/lecture-09. OpenAPI/TS совпадают; новый frontend build,
Docker build, полноценный PostgreSQL-набор и deploy в этом блоке не выполнялись.
Исторический docs/lab7/swagger.png сохранен; новый GET /docs проверяет HTML,
а не готовность всех браузерных ресурсов и не новый скриншот.

Следующий блок — лекция 10: PostgreSQL, схемы, SQL, индексы и реальные прежние планы.
Практики остаются отдельным следующим этапом. Итоговые четыре DOCX — в конце,
после пользовательского DOCX со скриншотами. Готовый сборник защиты не изменен.
docs.zip, миграции, Neon, Render и прежние отчеты сохранены.

---

# Проверки по мастер-промпту от 14 ноября 2026

Рабочая директория всех команд: C:/Users/comp/Documents/booknest.
Дата: 2026-11-14. Ветка codex/lab-defense-questions.

## Этап 1

Для подготовки артефактов используется Python из управляемого runtime
OpenAI.CodexPrimaryRuntime.v26-1112-737-0, а не окружение приложения.
Проверка Ruff выполняется установленным .venv/Scripts/python.exe.

| Команда или действие | Реальный результат |
| --- | --- |
| git status --short; git branch -a; git log --oneline -15; git remote -v | Состояние восстановлено; единственный прежний untracked-файл docs.zip сохранен. |
| python tools/build_defense_questions.py | 6 лабораторных, 31 основной вопрос, 6 дополнительных; все файлы и именованные символы найдены. Первая попытка потребовала предварительно создать stages-progress.md, затем завершилась успешно. |
| python tools/build_defense_docx.py | Создан отдельный DOCX и текстовый комплект; прежние шесть отчетов не изменены. |
| python .tools/render_defense.py pass1 | Штатный renderer, exit 0, 46 страниц. Обнаружено наследование шрифта заголовков от темы. |
| python .tools/render_defense.py pass2 | exit 0, 45 страниц. Обнаружена пустая страница 36 и линия титула. |
| python .tools/render_defense.py pass3 | exit 0, 44 страницы; разрывы разделов исправлены, выполнена дополнительная настройка межабзацных интервалов. |
| .venv/Scripts/python.exe -m ruff check tools/build_defense_questions.py tools/build_defense_docx.py tools/check_defense_artifacts.py | All checks passed. |
| git diff --check | Успешно для изменений на момент проверки; после завершения документов выполняется повторно. |

Номера страниц и финальная визуальная приемка фиксируются после последнего
преобразования в docs/audit/defense-docx-qa.md. Неокончательные прогоны не являются
приемкой финального файла.

Итоговый прогон accepted: exit 0, 40 страниц. Команда
python tools/check_defense_artifacts.py .tools/defense-qa/accepted успешна:
37 вопросов, 6 дословных демонстраций, все ссылки и 9 номеров содержания верны,
A4/TNR14/1,5/поля/отступ/PAGE проверены. Все 40 страниц визуально просмотрены;
финальные PNG сверены побайтно с просмотренными. Протокол:
docs/audit/defense-docx-qa.json. Итоговый Ruff снова All checks passed.

## Ранее проверенный прикладной код

CI 43584962994 на 98a1be3a00d8327f44e62c38e9984410360a696b завершен success:
165 backend-тестов, повтор этих же 165 в контейнерном профиле, 95 frontend-тестов.
Источник: docs/audit/final-ci-20261114.json.
Это сохраненный результат предыдущего блока; в этапе 1 backend/frontend заново
не запускались, поскольку прикладной код не меняется.

При первой индексации git diff --cached --check обнаружил концевые пробелы в строках
ссылок Markdown без имени символа. Исправлены текстовая версия и генератор;
DOCX не изменен. Итоговая проверка всего diff от c6cd382 выполняется повторно.

## Этап 2 Аудит ODT

Дата: 2026-11-14. CWD C:/Users/comp/Documents/booknest.
Ветка codex/lecture-practice-audit, исходное состояние cc256a7.

| Команда | Реальный результат |
| --- | --- |
| Управляемый Python tools/extract_course_odt.py | 1511/219 абзацев, по 8 учебных разделов; SHA-256 обоих оригиналов сохранены, таблиц/изображений/объектов 0. |
| Управляемый Python tools/build_course_audit.py | 356 записей, 82 вопроса, 98 уникальных файлов проверены; ссылки на реальные последние коммиты файлов. |
| Управляемый Python tools/check_course_audit.py | AUDIT_STRUCTURE_OK: все 204 нумерованных пункта учтены, 65 шагов, 28 фрагментов, 57 контекстных пунктов плана, 8 собственных задач практики 15. Дословность требований и реальные Git SHA проверены. |
| .venv/Scripts/python.exe -m ruff check tools/extract_course_odt.py tools/build_course_audit.py tools/check_course_audit.py | All checks passed. |

Валидатор подтвердил неизменность прикладных файлов и SHA-256 готового DOCX.
Backend, frontend, Docker и production в этом блоке заново не запускались:
реализуется только аудит. Сохраненный CI не выдается за новый запуск.
Протокол: docs/audit/course-audit-validation.json.

Первая проверка индексируемых TXT обнаружила служебный пробел после метки пустого
абзаца. Генератор исправлен, извлечения повторены, git diff --cached --check
успешен до коммита источников. Дословный текст и пробелы исходника в JSON сохранены.
После фиксации источников матрица пересобрана с их настоящими SHA; валидатор
и Ruff снова завершились успешно. Итоговый diff проверяется перед публикацией.

Проверка индекса матрицы обнаружила дополнительную пустую строку в конце
source-inventory.md. Удалена только завершающая пустая строка, исправлен генератор.
Это замечание оформления не меняет строки требований или результат сверки.

## Лекция 8 Маршруты и формы

14 ноября 2026, CWD C:/Users/comp/Documents/booknest/react-app,
ветка codex/lecture-08-materials от f9b1c8c.

| Команда | Фактический результат |
| --- | --- |
| npm.cmd test -- --reporter=json --outputFile=../.tools/lecture08/vitest.json | 95 тестов, 94 passed, 1 timeout 5000 ms Login при параллельных lint/build. Причина не установлена, успехом не считается. |
| npm.cmd test -- src/tests/Login.test.tsx --reporter=json --outputFile=../.tools/lecture08/login-retry.json | 5 passed, 0 failed. |
| npm.cmd test -- src/tests/RoutingAcceptance.test.tsx --reporter=json --outputFile=../.tools/lecture08/routing.json | 4 новых passed. |
| npm.cmd test -- --maxWorkers=2 --reporter=json --outputFile=../.tools/lecture08/full-retry.json | 99 passed, 0 failed, 19 файлов, 54,06 с. Таймауты и утверждения тестов не менялись. |
| npm.cmd run lint | Финальный запуск успешен после добавления тестов. |
| npm.cmd run build | tsc -b и Vite успешны после добавления тестов. |
| TypeScript AST, src/**/*.ts и src/**/*.tsx | 90 файлов, 0 AnyKeyword; вызов expect.any не считается типом any. |
| curl.exe GET /health с Accept: application/json | Первая попытка exit28/60,11 с; повтор exit0/200, status=ok/0,54 с. Не означает проверки БД, входа или всего CRUD. |

Протокол docs/lectures/lecture-08-validation.json, извлечение всех результатов
Vitest и реальные lint/build логи в docs/test-results/lecture-08/.
Сборщик проверил оригиналы 10 вопросов, 23 кодовые ссылки и SHA-256 DOCX защиты.
Backend-тесты не повторялись: серверный код не менялся. Нового deploy нет.
