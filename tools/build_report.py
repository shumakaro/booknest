"""Создаёт учебный DOCX из Markdown с заданным пользователем оформлением."""
import sys
from pathlib import Path
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.oxml.ns import qn


def build(source: Path) -> None:
    document = Document()
    section = document.sections[0]
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = section.bottom_margin = Cm(2)
    section.left_margin = Cm(3)
    section.right_margin = Cm(1.5)
    for name in ['Normal', 'Title', 'Heading 1', 'Heading 2', 'Heading 3', 'Caption']:
        style = document.styles[name]
        style.font.name = 'Times New Roman'
        style.font.size = Pt(14)
        style.font.color.rgb = RGBColor(0, 0, 0)
        style.element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'), 'Times New Roman')
        # Тематические шрифты Word иначе переопределяют Times New Roman в заголовках.
        fonts = style.element.get_or_add_rPr().rFonts
        for attr in list(fonts.attrib):
            if 'theme' in attr.lower():
                del fonts.attrib[attr]
        for attr in ['ascii', 'hAnsi', 'eastAsia', 'cs']:
            fonts.set(qn('w:' + attr), 'Times New Roman')
        style.paragraph_format.space_after = Pt(6)
    document.styles['Normal'].paragraph_format.line_spacing = 1.15
    # Удаляется декоративная граница из шаблона Word: всё оформление чёрное.
    for border in list(document.styles.element.iter(qn('w:pBdr'))):
        border.getparent().remove(border)
    document.add_paragraph('Место для титульного листа', 'Title')
    document.add_paragraph('Учебное заведение __________________________')
    document.add_paragraph('Дисциплина Современные веб технологии')
    document.add_paragraph('Студентка __________________ Группа __________')
    document.add_paragraph('Преподаватель ______________________________')
    document.add_paragraph('2026')
    document.add_page_break()
    for line in source.read_text(encoding='utf-8-sig').splitlines():
        if not line.strip():
            continue
        if line.startswith('# '):
            document.add_paragraph(line[2:], 'Title')
        elif line.startswith('## '):
            document.add_heading(line[3:], level=1)
        elif line.startswith('### '):
            document.add_heading(line[4:], level=2)
        elif line.startswith('[Место'):
            paragraph = document.add_paragraph(line)
            paragraph.paragraph_format.space_before = Pt(30)
            paragraph.paragraph_format.space_after = Pt(30)
            paragraph.paragraph_format.keep_with_next = True
        elif line.startswith('Рисунок '):
            document.add_paragraph(line, 'Caption')
        else:
            document.add_paragraph(line)
    output = source.with_suffix('.docx')
    document.save(output)
    print(output)

if __name__ == '__main__':
    for value in sys.argv[1:]:
        build(Path(value))
