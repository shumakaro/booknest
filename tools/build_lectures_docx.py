"""Оформляет единый отчет по лекциям из проверяемого JSON.

Запускать только штатным Python из workspace dependencies. Итоговый файл
не перезаписывает прежние отчеты лабораторных или сборник защиты.
"""
import json
import re
from pathlib import Path
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "docs/lectures/lectures-08-15.json").read_text(encoding="utf-8"))
TARGET = ROOT / "docs/reports/BOOKNEST_ЛЕКЦИИ_8-15.docx"
doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Inches(8.5), Inches(11)
sec.top_margin = sec.bottom_margin = sec.left_margin = sec.right_margin = Cm(2)
for style in doc.styles:
    if style.type in {1, 2}:
        style.font.name = "Times New Roman"
        style.font.size = Pt(14)
        style.font.color.rgb = RGBColor(0, 0, 0)
        fonts = style.element.get_or_add_rPr().find(qn("w:rFonts"))
        if fonts is None:
            fonts = OxmlElement("w:rFonts")
            style.element.get_or_add_rPr().append(fonts)
        for slot in ["ascii", "hAnsi", "eastAsia", "cs"]:
            fonts.set(qn("w:" + slot), "Times New Roman")
        for key in list(fonts.attrib):
            if "Theme" in key:
                del fonts.attrib[key]
for border in list(doc.styles.element.iter(qn("w:pBdr"))):
    border.getparent().remove(border)
normal = doc.styles["Normal"].paragraph_format
normal.line_spacing = 1.15
normal.space_after = Pt(5)
normal.widow_control = True
for name in ["Title", "Subtitle", "Heading 1", "Heading 2", "Heading 3"]:
    f = doc.styles[name].paragraph_format
    f.first_line_indent = Cm(0)
    f.space_before, f.space_after = Pt(10), Pt(5)
    f.keep_with_next = True
    doc.styles[name].font.bold = name != "Subtitle"
footer = sec.footer.paragraphs[0]
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
field = OxmlElement("w:fldSimple")
field.set(qn("w:instr"), "PAGE")
footer._p.append(field)


def paragraph(text: str, label: str = "") -> None:
    """Оставляет связный текст и видимую подпись вместо громоздкой таблицы."""
    p = doc.add_paragraph()
    p.alignment = (WD_ALIGN_PARAGRAPH.LEFT if label in {
        "Код.", "Код и подтверждения.", "Статус и подтверждения.", "Расположение.", "Документация."
    } else WD_ALIGN_PARAGRAPH.JUSTIFY)
    if label:
        p.add_run(label + " ").bold = True
    p.add_run(text)


def code(text: str) -> None:
    """Переносы длинной строки выполняет Word без обрезки и мелкого шрифта."""
    for line in text.strip().splitlines():
        p = doc.add_paragraph(line or " ")
        p.paragraph_format.line_spacing = 1
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.left_indent = Cm(0.3)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def excerpt(path: str, marker: str, count: int) -> None:
    lines = (ROOT / path).read_text(encoding="utf-8").splitlines()
    start = next(i for i, line in enumerate(lines) if marker in line)
    paragraph(f"{path}, строки {start + 1}–{min(start + count, len(lines))}. "
              "Полный файл сохранен в репозитории; ниже приведен связанный с темой фрагмент.", "Код.")
    code("\n".join(lines[start:start + count]))


doc.add_paragraph("BookNest", "Title").alignment = WD_ALIGN_PARAGRAPH.CENTER
doc.add_paragraph("Лекции 8 15", "Subtitle").alignment = WD_ALIGN_PARAGRAPH.CENTER
paragraph("Контрольные вопросы ответы и домашние задания")
paragraph("Современные веб технологии")
paragraph("Студент ____________________    Группа ____________________")
paragraph("Преподаватель ____________________")
paragraph("Дата сверки 14 ноября 2026 года")
paragraph("В документе собраны все 82 контрольных вопроса восьми лекций, подробные и краткие ответы, "
          "домашние задания, пояснения реализации и реальные подтверждения BookNest. "
          "Материал подготовлен для изучения и личной защиты. Практические занятия 8–15 "
          "будут оформлены отдельным документом.")
paragraph("Содержательная версия до получения пользовательских скриншотов. Непроведенная ручная "
          "проверка, личная демонстрация и исключенное взаимное ревью не названы выполненными. "
          "Данные титула заполняются владельцем.")
doc.add_heading("Содержание", level=1).paragraph_format.page_break_before = True
for unit in DATA["units"]:
    paragraph(f"Лекция {unit['number']}  {unit['title']}")
paragraph("В конце приведены SQL-запросы, сравнение схем, официальная самооценка, "
          "реестр проверок и список ожидаемых иллюстраций. Навигация по заголовкам доступна в Word.")
doc.add_heading("Исходники и порядок проверки", level=1)
paragraph("Основной источник вопросов — предоставленный веблекц.odt. Их формулировки "
          "и номера абзацев сохранены в машинном источнике lectures-08-15.json. "
          "Объем домашних заданий проверен по методичке и матрице 356 требований. "
          "Контекст преподавательских демонстраций не превращен в дополнительные домашние задания.")
paragraph("Кодовая основа включает опубликованные материалы лекций 8 и 9. Полный CI 43599915876 "
          "на 809f061 проверил backend, frontend, Docker и браузерный сценарий. Это сохраненный результат; "
          "новыми в этом этапе являются сравнение схем и локальный цикл миграций в двух новых scratch-БД. "
          "Рабочие Neon и Render не изменялись.")
paragraph("Обозначения статусов: DONE — подтверждено; PARTIAL — выполнено частично; "
          "NOT_VERIFIED — не проверено; EXCLUDED_PEER_TASK — взаимное задание исключено. "
          "В 55 записях домашних заданий учитываются также исходный контекст и подзадачи; "
          "это не 55 независимых новых реализаций.")

snippets = {
    8: ("react-app/src/app/router/AppRouter.tsx", "export function AppRouter", 12),
    9: ("app/core/http.py", "async def validation_error", 5),
    10: ("db/schema.sql", "CREATE TABLE book_genres", 5),
    11: ("app/services/catalog.py", "merged.update(data)", 7),
    12: ("app/core/auth.py", "def get_own_loan", 9),
    13: ("react-app/src/api/client.ts", "export function toUserMessage", 7),
    14: ("docker-compose.yml", "services:", 12),
}
for unit in DATA["units"]:
    n = unit["number"]
    h = doc.add_heading(f"Лекция {n} {unit['title']}", level=1)
    h.paragraph_format.page_break_before = True
    paragraph(unit["theory"], "Связь с проектом.")
    if n == 10:
        doc.add_picture(str(ROOT / "db/er.png"), width=Cm(16.8))
        paragraph("Рисунок 1  Существующая ER диаграмма BookNest")
        paragraph("Диаграмма показывает исходную учебную схему. Последующие расширения "
                  "авторизации и внешних книг представлены миграциями и текущими моделями.")
    if n in snippets:
        path, marker, count = snippets[n]
        # Если объявление функции отличается, ошибка останавливает сборку вместо выдуманного фрагмента.
        excerpt(path, marker, count)
    for q in unit["questions"]:
        doc.add_heading(f"Вопрос {q['number']}", level=2)
        paragraph(q["question"])
        doc.paragraphs[-1].paragraph_format.keep_with_next = True
        paragraph(q["answer"], "Подробный ответ.")
        if n < 10:
            paragraph(q["booknest"], "В BookNest.")
        paragraph(q["oral"], "Краткий ответ.")
        paragraph("; ".join(f"{r['path']}, строка {r['line']}" for r in q["refs"]), "Код и подтверждения.")
        paragraph(f"веблекц.odt, абзац {q['source_paragraph']}.", "Источник вопроса.")
    doc.add_heading("Домашнее задание и выполнение", level=2)
    for row in unit["homework"]:
        paragraph(row["requirement"], row["id"])
        paragraph(row["check"] + (" " + row["note"] if row["note"] else ""), "Выполнение.")
        paragraph(row["status"] + ". " + "; ".join(row["files"]), "Статус и подтверждения.")
    if n == 12:
        doc.add_heading("Пятнадцать пунктов Security Review", level=2)
        table = (ROOT / "docs/security-review.md").read_text(encoding="utf-8")
        for line in table.splitlines():
            cells = [c.strip() for c in line.strip("|").split("|")]
            if cells and cells[0].isdigit() and len(cells) >= 5:
                paragraph(cells[1] + ". Статус: " + cells[2] + ". " + cells[4], "Пункт " + cells[0])
                paragraph(re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", cells[3]), "Расположение.")
    for title, url in DATA["references"].get(str(n), []):
        paragraph(title + " — " + url, "Документация.")

doc.add_heading("SQL запросы и прикладной смысл", level=1).paragraph_format.page_break_before = True
validation = json.loads((ROOT / "docs/lectures/lecture-10-11-db-validation.json").read_text(encoding="utf-8"))
sql_source = (ROOT / "db/queries.sql").read_text(encoding="utf-8")
purposes = re.findall(r"^-- \d+ (.+)$", sql_source, flags=re.M)
for row, purpose in zip(validation["sql_queries"], purposes, strict=True):
    doc.add_heading("Запрос " + str(row["number"]), level=2)
    paragraph(purpose)
    code(row["sql"] + ";")
    paragraph(f"Новый локальный запуск: получено строк {row['rows']}. "
              "Использовались отдельные учебные данные, а не записи пользователей Neon.")
doc.add_heading("Сравнение схем и обратимость", level=1).paragraph_format.page_break_before = True
paragraph("В отдельной DDL-базе выполнены schema.sql и seed.sql. В другой новой БД применена 001_schema. "
          "Снимки столбцов и ограничений совпали. Затем ORM-база обновлена до 006; alembic check "
          "не обнаружил новых операций. После отката к 001 имена с повторными и конечными пробелами совпали; "
          "повторное обновление сохранило 30 книг.")
for table in validation["base_tables"]:
    cols = [f"{r[1]} {r[3]}" + (" NOT NULL" if r[4] == "NO" else "")
            for r in validation["initial_schema"]["columns"] if r[0] == table]
    paragraph(", ".join(cols) + ".", table)
paragraph("Сравнивались также default, identity, длины строк и все 28 определений ограничений. "
          "Полный поэлементный результат: lecture-10-11-schema-comparison.md и JSON-протокол. "
          "Представление overdue_loans проверялось отдельно и не считалось восьмой таблицей.")
paragraph("Первоначальные попытки входа в локальный кластер под postgres завершились отказом. "
          "Правильная ранее созданная учетная запись booknest была установлена без изменения пароля; "
          "после этого проверки прошли. Базы с неудачных соединений не создавались.")
doc.add_heading("Примеры запросов и ответов API", level=1).paragraph_format.page_break_before = True
design = (ROOT / "docs/api-design.md").read_text(encoding="utf-8")
examples = design.split("## Три ключевые операции", 1)[1].split("## Ошибка", 1)[0]
inside = False
for line in examples.strip().splitlines():
    if line.startswith("~~~") or line.startswith(chr(96) * 3):
        inside = not inside
    elif line.strip():
        if inside:
            code(line)
        else:
            paragraph(line.replace(chr(96), ""))
paragraph("Полный перечень действующих операций приведен ниже. Публичное чтение не требует токена; "
          "изменения каталога доступны библиотекарю. Личные выдачи и желаемое проверяют текущего пользователя.")
api_map = json.loads((ROOT / "docs/lectures/lecture-09-api-map.json").read_text(encoding="utf-8"))
for op in api_map["operations"]:
    paragraph(f"{op['purpose']}. Доступ: {op['role']}. Успех: {', '.join(op['success'])}; "
              f"ошибки: {op['errors']}.", op["method"] + " " + op["path"] + ".")
doc.add_heading("Исходный DDL и обоснование индексов", level=1).paragraph_format.page_break_before = True
paragraph("Ниже приведен полный исходный DDL ревизии 001. Это учебный скрипт для новой БД, "
          "не команда повторного создания таблиц приложения. Текущая версия развивается миграциями до 006.")
code((ROOT / "db/schema.sql").read_text(encoding="utf-8-sig"))
paragraph("B-tree по author_id, year, id соответствует выборке книг автора с упорядочением и LIMIT. "
          "GIN по tsvector предназначен для полнотекстового условия. Индекс занимает место и удорожает запись; "
          "на малой таблице Seq Scan может быть правильным выбором. Исходники эксперимента — db/benchmark.sql.")
log = (ROOT / "docs/lab8/sql-results.txt").read_text(encoding="utf-8")
measures = [line for line in log.splitlines() if "Execution Time:" in line or "Index Scan using benchmark" in line]
code("\n".join(measures[-6:]))
paragraph("Это сохраненный вывод старого локального опыта на 500000 benchmark_books. "
          "Числа относятся к разным двум запросам до/после индексов; они не означают ускорение каждого запроса BookNest. "
          "Точные планы со строками и стратегией находятся в docs/lab8/sql-results.txt. Новый запуск в этом этапе проверил SQL на 30 книгах.")
doc.add_heading("Запуск тестов и контейнеров", level=1).paragraph_format.page_break_before = True
paragraph("Конфигурация описана в .env.example. Настоящие значения DATABASE_URL, SECRET_KEY и паролей "
          "задаются владельцем среды и не вкладываются в документ. VITE-переменные доступны в клиентском коде и не подходят для секретов.")
code("python -m pytest -q\nnpm --prefix react-app run test -- --maxWorkers=2\n"
     "npm --prefix react-app run lint\nnpm --prefix react-app run build\n"
     "docker compose up -d --build --wait\ndocker compose ps\ndocker image ls")
paragraph("Команды выполняются после подготовки окружения по README. Pytest требует отдельной _test-БД "
          "и проверяет отличие от рабочей. Здесь команды приведены как инструкция, а не утверждение, что они "
          "запущены еще раз: фактические результаты полного набора сохранены в CI 43599915876.")
paragraph("Backend: docker/api.Dockerfile, frontend: react-app/Dockerfile. "
          "В Compose db хранит данные в именованном томе; api ожидает готовность БД и применяет Alembic; "
          "seed готовит данные чистого учебного стенда; web раздает SPA и проксирует API. "
          "Test-profile использует отдельную БД. В Render единый multi-stage образ "
          "docker/render.Dockerfile собирает React и обслуживает его вместе с API, а PostgreSQL находится в Neon.")
paragraph("Проверка с нуля выполнена на одноразовом CI runner. Рабочие тома не удалялись. "
          "После обновления требуется совместимость кода и миграций, готовая резервная копия, health и основной сценарий. "
          "Откат кода не означает автоматическую безопасность отката данных.")
paragraph("Проверка не обнаружила новых операций, ниже приведена история ревизий.", "Реальный новый вывод Alembic.")
code(validation["metadata_check"])
doc.add_heading("Самооценка по официальной рубрике", level=1).paragraph_format.page_break_before = True
assessment = (ROOT / "docs/lectures/lecture-15-self-assessment.md").read_text(encoding="utf-8")
buffer = []
for line in assessment.splitlines():
    if not line.strip() or line.startswith("|"):
        if buffer:
            paragraph(" ".join(buffer))
            buffer = []
    if line.startswith("|") and not line.startswith("| ---") and "Максимум" not in line:
        c = [x.strip() for x in line.strip("|").split("|")]
        paragraph(f"{c[2]} из {c[1]}. {c[3]}", c[0] + ".")
    elif line and not line.startswith(("#", "|")):
        buffer.append(line)
if buffer:
    paragraph(" ".join(buffer))
doc.add_heading("Проверки и оставшиеся подтверждения", level=1).paragraph_format.page_break_before = True
paragraph("Новая локальная проверка: 7 базовых таблиц, 28 ограничений, 30 книг, 12 SQL-запросов, "
          "равенство DDL и 001, чистый alembic check для 006, успешный downgrade и повторный upgrade. "
          "Адрес подключения фиксирован на 127.0.0.1:55432; пароль не выводился. "
          "Прежние базы, миграции и пользовательские данные не пересоздавались.")
paragraph("Сохраненные проверки: N+1 26→3; два плана индексов на benchmark_books; "
          "локальный frontend лекции 8 — 99 passed, lint/build; лекция 9 — 44 passed, "
          "1 deselected и 11 HTTP-сценариев в памяти; полный CI checks/containers success на 809f061. "
          "Эти разные наборы и повторные прогоны нельзя суммировать как уникальные тесты.")
paragraph("Ссылки: https://github.com/shumakaro/booknest/actions/runs/43599915876 ; "
          "docs/lectures/lecture-09-ci.json ; docs/lectures/lecture-10-11-db-validation.json.")
paragraph("После получения кадров будут добавлены изображения текущих страниц, Swagger, "
          "проверок ролей и cookie, Lighthouse, статуса Render/Neon и личных ручных действий. "
          "Исторический Swagger docs/lab7/swagger.png не выдается за новый кадр. "
          "Изображения секретов, паролей, токенов и строк подключения в отчет не включаются.")
paragraph("Открыты личная демонстрация, окончательные скриншоты README, визуальная приемка старого "
          "слайда Compose, полный скан истории на секреты и production-cookie. "
          "Существующий слайд описывает Compose с Nginx; Render использует единый образ FastAPI "
          "с внешней Neon. JWT подтверждает личность, а владельца проверяет get_own_loan.")
paragraph("После лекций следующим этапом выполняются и оформляются практические занятия 8–15. "
          "Общий отчет лабораторных 7–12 собирается после пользовательского DOCX со скриншотами. "
          "Прежние отдельные отчеты и готовый сборник защиты сохранены.")
TARGET.parent.mkdir(parents=True, exist_ok=True)
doc.save(TARGET)
print(str(TARGET))
