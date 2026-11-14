"""Оформление сборника защиты без изменения существующих отчетов."""

import json
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "docs/defense/questions.json").read_text(encoding="utf-8"))
TARGET = ROOT / "docs/reports/ВОПРОСЫ_И_ОТВЕТЫ_ДЛЯ_ЗАЩИТЫ_ЛР7-12.docx"
PAGES = ROOT / "docs/defense/toc-pages.json"
pages = json.loads(PAGES.read_text(encoding="utf-8")) if PAGES.exists() else {}
doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Cm(21), Cm(29.7)
sec.top_margin = sec.bottom_margin = sec.left_margin = sec.right_margin = Cm(2)
sec.header_distance = sec.footer_distance = Cm(1)

# Все стили используют заданные пользователем шрифт, размер и черный цвет.
for style in doc.styles:
    if style.type == 1 or style.type == 2:
        style.font.name = "Times New Roman"
        style.font.size = Pt(14)
        style.font.color.rgb = RGBColor(0, 0, 0)
        props = style.element.get_or_add_rPr()
        fonts = props.find(qn("w:rFonts"))
        if fonts is None:
            fonts = OxmlElement("w:rFonts")
            props.insert(0, fonts)
        for slot in ("ascii", "hAnsi", "eastAsia", "cs"):
            fonts.set(qn("w:" + slot), "Times New Roman")
            fonts.attrib.pop(qn("w:" + slot + "Theme"), None)
        for color in props.findall(qn("w:color")):
            for key in list(color.attrib):
                if key != qn("w:val"):
                    del color.attrib[key]
            color.set(qn("w:val"), "000000")
normal = doc.styles["Normal"].paragraph_format
normal.line_spacing = 1.5
normal.first_line_indent = Cm(1.25)
normal.space_after = Pt(0)
normal.widow_control = True
# У стандартного шаблона Title может быть цветная линия, ее здесь быть не должно.
for border in list(doc.styles.element.iter(qn("w:pBdr"))):
    border.getparent().remove(border)
for name in ("Title", "Subtitle", "Heading 1", "Heading 2", "Heading 3"):
    fmt = doc.styles[name].paragraph_format
    fmt.first_line_indent = Cm(0)
    fmt.line_spacing = 1.5
    fmt.space_before, fmt.space_after = Pt(10), Pt(6)
    fmt.keep_with_next = True
    doc.styles[name].font.bold = name != "Subtitle"
    doc.styles[name].font.size = Pt(14)


def paragraph(text="", label=None, align=WD_ALIGN_PARAGRAPH.JUSTIFY):
    """Смысловой блок переносится естественно; подпись остается с началом ответа."""
    p = doc.add_paragraph()
    p.alignment = align
    if label:
        p.add_run(label + " ").bold = True
    p.add_run(text)
    return p


def heading(text, bookmark):
    p = doc.add_heading(text, level=1)
    p.paragraph_format.page_break_before = True
    start = OxmlElement("w:bookmarkStart")
    start.set(qn("w:id"), str(bookmark))
    start.set(qn("w:name"), "section_" + str(bookmark))
    end = OxmlElement("w:bookmarkEnd")
    end.set(qn("w:id"), str(bookmark))
    p._p.insert(0, start)
    p._p.append(end)


def question(item):
    doc.add_heading("Вопрос " + item["id"].replace("-", " "), level=2)
    paragraph(item["question"] + ("?" if not item["question"].endswith("?") else ""), label="Формулировка.")
    paragraph(item["kind"] + ".", label="Источник.")
    paragraph(item["answer"], label="Полный ответ.")
    paragraph(item["implementation"], label="Реализация в BookNest.")
    code = item["code"]
    where = code["path"] + ", строка " + str(code["line"])
    if code["symbol"]:
        where += ", " + code["symbol"]
    paragraph(where + ".", label="Расположение кода или подтверждения.")
    paragraph(item["oral"], label="Краткий ответ для защиты.")
    paragraph(item["demo"], label="Что показать преподавателю.")
    paragraph(item["mistake"], label="Типичная ошибка.")


# Титул без вымышленных персональных данных и декоративных элементов.
p = doc.add_paragraph("BookNest", "Title")
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
paragraph("Вопросы и ответы для защиты лабораторных работ 7 12", align=WD_ALIGN_PARAGRAPH.CENTER)
paragraph("Современные веб технологии", align=WD_ALIGN_PARAGRAPH.CENTER)
paragraph("Учебный сборник по существующему проекту", align=WD_ALIGN_PARAGRAPH.CENTER)
paragraph("Студент ____________________")
paragraph("Группа ____________________")
paragraph("Преподаватель ____________________")
paragraph("Дата сверки 14 ноября 2026 года")
paragraph("В сборнике собраны 37 вопросов с развернутыми и краткими ответами. Сохранены требования демонстрации всех шести лабораторных. Учебные вопросы отделены от единственного прямого вопроса методички.")
paragraph("Кодовая версия: 98a1be3. Документальные уточнения продолжают c6cd382. Результаты предыдущих запусков отмечены как сохраненные. Сборник не является подтверждением полного выполнения курса или новым развертыванием сайта.")
doc.add_heading("Содержание", level=1).paragraph_format.page_break_before = True
titles = [f"Лабораторная работа {i}" for i in range(7, 13)] + [
    "Дополнительные вопросы", "Памятка для устной защиты", "Список источников"
]
for index, title in enumerate(titles, 1):
    p = doc.add_paragraph()
    p.paragraph_format.first_line_indent = Cm(0)
    link = OxmlElement("w:hyperlink")
    link.set(qn("w:anchor"), "section_" + str(index))
    run = OxmlElement("w:r")
    text = OxmlElement("w:t")
    text.text = title + ("  " + str(pages[title]) if title in pages else "")
    run.append(text)
    link.append(run)
    p._p.append(link)
paragraph(DATA["provenance"], label="Правило источников.")
paragraph("Контрольные вопросы лекций из веблекц.odt относятся к отдельному этапу. Они не переименованы в официальные вопросы лабораторных. В вебпр.odt отдельного списка вопросов защиты ЛР7-12 не обнаружено.")

SNIPPETS = {
    7: ("app/routers/catalog_db.py", "def update_book", 3),
    8: ("app/db.py", "def get_db", 4),
    9: ("app/core/security.py", "def hash_password", 3),
    10: ("react-app/src/api/client.ts", "export function toUserMessage", 7),
    11: ("docker/api.Dockerfile", "FROM", 6),
    12: ("app/main.py", '    @application.get("/health"', 4),
}
for index, lab in enumerate(DATA["labs"], 1):
    heading(titles[index - 1], index)
    paragraph(lab["title"], label="Тема.")
    paragraph(lab["theory"], label="Основная теория.")
    paragraph(lab["source"], label="Методический источник.")
    paragraph(lab["official_demo"], label="Что демонстрирует студент по методичке дословно.")
    paragraph("При показе используются отдельные тестовые данные. Указание методички об удалении базы или тома не является разрешением удалять рабочие данные. Наличие описанного сценария в сборнике не означает, что демонстрация уже выполнена.")
    path, start, count = SNIPPETS[lab["number"]]
    lines = (ROOT / path).read_text(encoding="utf-8-sig").splitlines()
    begin = next(i for i, line in enumerate(lines) if start in line)
    caption = paragraph(path + ", строки " + str(begin + 1) + "-" + str(begin + count) + ".", label="Фрагмент реализации.")
    caption.paragraph_format.keep_with_next = True
    for offset, line in enumerate(lines[begin:begin + count]):
        p = paragraph(line, align=WD_ALIGN_PARAGRAPH.LEFT)
        p.paragraph_format.first_line_indent = Cm(0)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.keep_with_next = offset < count - 1
    for item in lab["questions"]:
        question(item)

heading("Дополнительные вопросы", 7)
paragraph("Следующие вопросы составлены для подготовки к защите. Они не являются дословным перечнем преподавателя и не заменяют требования демонстрации.")
for item in DATA["extra"]:
    paragraph("Лабораторная работа " + str(item["lab"]) + ".", label="Связь с работой.")
    question(item)

heading("Памятка для устной защиты", 8)
paragraph("Ответ удобно начинать с назначения технологии, затем объяснять решение в BookNest и завершать проверяемым примером. При вопросе о запуске называется конкретный протокол, дата и SHA. Если проверка еще не выполнена, это отмечается прямо.")
for lab in DATA["labs"]:
    paragraph(
        {7: "Показать шесть HTTP-сценариев и разделение Create, Update, Read.",
         8: "Объяснить ER-связи, транзакцию выдачи, миграции, N+1 и планы индексов.",
         9: "Различить личность, роль и владельца; объяснить JWT, bcrypt, cookie и denylist.",
         10: "Показать серверную пагинацию, обработку ошибок, гонки и отрицательные тесты.",
         11: "Объяснить сеть, multi-stage, healthcheck, том и независимый CI.",
         12: "Показать опубликованную версию, runbook, HTTPS и проверенное восстановление."}[lab["number"]],
        label="ЛР" + str(lab["number"]) + ".",
    )
paragraph("Сохраненный CI 43584962994 на 98a1be3 подтвердил 165 backend-тестов и 95 frontend-тестов. Контейнерный профиль повторил те же 165 backend-тестов. Эти числа не складываются как разные сценарии.")
paragraph("Восстановление копии Neon подтверждено отдельным безопасным JSON от 14 ноября. Новая цель была локальной; production_writes=false. Исходная БД не пересоздавалась.")
paragraph("Публичный сайт ранее проверен на 1eb0eb9. Изменения PR33 не считаются опубликованными. Полная проверка cookie, Lighthouse и пользовательские кадры остаются отдельными действиями.")
paragraph("На защите и скриншотах не раскрываются пароли, JWT, cookie, реальные URL подключения, содержимое .env, приватный dump и хеши пользователей. Рабочая БД не удаляется. Сценарии создания, удаления и конфликтов выполняются на тестовых объектах.")
heading("Список источников", 9)
for text in [
    "Силлабус Современные веб технологии: web-technologies-syllabus.html, разделы ЛР7-12. Текстовые извлечения: docs/course/lab7.txt - lab12.txt. Дословные разделы демонстрации сохранены в сборнике.",
    "веблекц.odt и вебпр.odt из C:/Users/comp/Desktop. Просмотр структуры и поиск вопросов использованы для разграничения источников. Полный аудит содержания относится к следующему этапу.",
    "Исходный код shumakaro/booknest на 98a1be3; документальная основа c6cd382. Точные файлы и символы приведены в ответах. Контроль их существования выполняет tools/build_defense_questions.py.",
    "Прежние авторские ответы: tools/build_detailed_reports.py, словарь LABS, поля qa для ЛР7-12. Формулировки использованы повторно, ответы расширены и исправлены.",
    "docs/audit/final-ci-20261114.json. GitHub Actions: https://github.com/shumakaro/booknest/actions/runs/43584962994.",
    "docs/audit/neon-backup-restore-20261114.json; docs/lab8/n-plus-one-before.log и n-plus-one-after.log; docs/lab8/orm-sql-comparison.md.",
    "docs/security-review.md, docs/api-design.md, docs/deployment.md, docs/audit/LABS7_12_MATRIX.md. Их ограничения сохраняются, наличие документа не подменяет проверку.",
    "Мастер-промпт владелицы от 14 ноября 2026: приоритет защиты, отдельные статусы, исключение взаимных заданий и запрет вымышленных результатов.",
]:
    paragraph(text)

# Настоящее поле номера страницы отображается после преобразования LibreOffice.
footer = sec.footer.paragraphs[0]
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
footer.paragraph_format.first_line_indent = Cm(0)
field = OxmlElement("w:fldSimple")
field.set(qn("w:instr"), "PAGE")
footer._p.append(field)
doc.core_properties.title = "BookNest Вопросы и ответы для защиты ЛР7 12"
doc.core_properties.subject = "Подготовка к защите существующего проекта"
doc.core_properties.author = "BookNest"
TARGET.parent.mkdir(parents=True, exist_ok=True)
doc.save(TARGET)

# Текстовая версия и чек-лист позволяют рецензировать все ответы в Git.
md = ["# Вопросы и ответы для защиты ЛР7-12", "", DATA["provenance"], ""]
check = [
    "# Проверка сборника защиты ЛР7-12", "",
    "Дата: 2026-11-14. Ветка codex/lab-defense-questions. Основание c6cd382.", "",
    "Всего 37 вопросов: 1 прямой вопрос методички, 30 прежних авторских и 6 дополнительных.",
    "Исходная нумерация официальному вопросу не приписана. Технический ID L12-O01 создан для учета.",
    "Все шесть разделов демонстрации сохранены дословно; их формулировки не объявлены списком контрольных вопросов.", "",
    "| ID | Вопрос | Источник | Код или подтверждение | Статус |",
    "| --- | --- | --- | --- | --- |",
]
for lab in DATA["labs"]:
    md += ["## Лабораторная работа " + str(lab["number"]), "", lab["theory"], "",
           "### Демонстрация по методичке дословно", "", lab["official_demo"], ""]
    for item in lab["questions"]:
        md += ["### " + item["id"] + " " + item["question"], "", item["kind"], ""]
        for label, key in [("Полный ответ", "answer"), ("Реализация", "implementation"), ("Краткий ответ", "oral"), ("Демонстрация", "demo"), ("Типичная ошибка", "mistake")]:
            md += ["**" + label + ".** " + item[key], ""]
        c = item["code"]
        md += [f"Код: {c['path']}:{c['line']} {c['symbol'] or ''}", ""]
        origin = lab["source"] if item["id"].endswith("O01") else "tools/build_detailed_reports.py LABS.qa; сверка " + lab["source"]
        check.append(f"| {item['id']} | {item['question']} | {origin} | {c['path']}:{c['line']} | CONTENT_VERIFIED |")
md += ["## Дополнительные авторские вопросы", ""]
for item in DATA["extra"]:
    md += ["### " + item["id"] + " " + item["question"], "", item["answer"], "",
           "**Краткий ответ.** " + item["oral"], "", "**Демонстрация.** " + item["demo"], ""]
    c = item["code"]
    check.append(f"| {item['id']} | {item['question']} | Авторский дополнительный; ЛР{item['lab']} | {c['path']}:{c['line']} | CONTENT_VERIFIED |")
check += ["", "## Источники и ограничения", "",
          "- Веблекц.odt содержит контрольные вопросы лекций, а не отдельный список защиты ЛР.",
          "- Вебпр.odt не содержит отдельного списка вопросов защиты ЛР7-12.",
          "- Сведения о CI и восстановлении являются сохраненными подтверждениями; новый запуск приложения не заявляется.",
          "- Визуальная приемка DOCX фиксируется отдельно в docs/audit/defense-docx-qa.md.",
          "- CONTENT_VERIFIED означает сверку содержания и существования ссылок; это не общий статус завершения этапа.",
          ""]
(ROOT / "docs/defense/questions.md").write_text("\n".join(md), encoding="utf-8")
(ROOT / "docs/audit/labs-7-12-defense-checklist.md").write_text("\n".join(check), encoding="utf-8")
print(str(TARGET))
