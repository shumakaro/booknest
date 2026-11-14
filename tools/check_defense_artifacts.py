"""Проверка содержания и верстки сборника; визуальную приемку не подменяет."""

import argparse
import json
from pathlib import Path
import re
from zipfile import ZipFile
import xml.etree.ElementTree as ET

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("render_dir", type=Path)
parser.add_argument("--write-toc", action="store_true")
args = parser.parse_args()
data = json.loads((ROOT / "docs/defense/questions.json").read_text(encoding="utf-8"))
docx = ROOT / "docs/reports/ВОПРОСЫ_И_ОТВЕТЫ_ДЛЯ_ЗАЩИТЫ_ЛР7-12.docx"
with ZipFile(docx) as archive:
    broken = archive.testzip()
    xml = ET.fromstring(archive.read("word/document.xml"))
    styles = ET.fromstring(archive.read("word/styles.xml"))
    footer = archive.read("word/footer1.xml")
ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
# Весь текст берется только из w:t, без инструкций полей и атрибутов.
paragraphs = [
    "".join(x.text or "" for x in p.findall(".//w:t", ns))
    for p in xml.findall(".//w:p", ns)
]
all_text = "\n".join(paragraphs)
questions = [q for lab in data["labs"] for q in lab["questions"]] + data["extra"]
assert len(questions) == 37
assert broken is None
for q in questions:
    assert q["question"] in all_text, q["id"]
    assert q["oral"] in all_text, q["id"]
    assert q["answer"] in all_text, q["id"]
    assert len(re.findall(r"[.!?](?:\s|$)", q["oral"])) in range(3, 7), q["id"]
    assert (ROOT / q["code"]["path"]).is_file(), q["id"]
for lab in data["labs"]:
    assert lab["official_demo"] in all_text, lab["number"]
    source = (ROOT / lab["source"]).read_text(encoding="utf-8-sig")
    assert lab["official_demo"] in source
assert data["labs"][-1]["questions"][0]["question"] in (ROOT / "docs/course/lab12.txt").read_text(encoding="utf-8-sig")
for name in ["Normal", "Title", "Heading1", "Heading2"]:
    s = styles.find(f"w:style[@w:styleId='{name}']", ns)
    fonts = s.find("w:rPr/w:rFonts", ns)
    assert fonts.get("{" + ns["w"] + "}ascii") == "Times New Roman", name
    assert not any("Theme" in key for key in fonts.attrib), name
    assert s.find("w:rPr/w:sz", ns).get("{" + ns["w"] + "}val") == "28", name
normal = styles.find("w:style[@w:styleId='Normal']", ns)
assert normal.find("w:pPr/w:spacing", ns).get("{" + ns["w"] + "}line") == "360"
assert normal.find("w:pPr/w:ind", ns).get("{" + ns["w"] + "}firstLine") == "709"
section = xml.find(".//w:sectPr", ns)
size = section.find("w:pgSz", ns)
assert [size.get("{" + ns["w"] + "}" + key) for key in ["w", "h"]] == ["11906", "16838"]
margins = section.find("w:pgMar", ns)
assert all(margins.get("{" + ns["w"] + "}" + key) == "1134" for key in ["top", "right", "bottom", "left"])
assert b"PAGE" in footer
assert len(xml.findall(".//w:hyperlink", ns)) == 9
assert not styles.findall(".//w:pBdr", ns)
reader = PdfReader(next(args.render_dir.glob("*.pdf")))
texts = [p.extract_text() for p in reader.pages]
titles = [f"Лабораторная работа {i}" for i in range(7, 13)] + [
    "Дополнительные вопросы", "Памятка для устной защиты", "Список источников"
]
toc = {}
for i, text in enumerate(texts, 1):
    # LibreOffice записывает номер нижнего колонтитула первым в потоке PDF.
    body = re.sub(r"^\s*\d+\s*\n", "", text).strip()
    assert len(body) > 100, f"Пустая или почти пустая страница {i}"
    for title in titles:
        if body.startswith(title):
            toc[title] = i
assert len(toc) == 9, toc
if args.write_toc:
    (ROOT / "docs/defense/toc-pages.json").write_text(
        json.dumps(toc, ensure_ascii=False, indent=2), encoding="utf-8"
    )
else:
    for title, page in toc.items():
        assert f"{title}  {page}" in all_text, (title, page)
summary = {
    "document": docx.relative_to(ROOT).as_posix(),
    "questions": 37, "official_questions": 1, "previous_author_questions": 30,
    "additional_author_questions": 6, "verbatim_demonstrations": 6,
    "pages": len(reader.pages), "toc": toc, "docx_zip_valid": True,
    "content_and_references_checked": True, "main_fonts_checked": True,
    "visual_inspection": "SEPARATE_REQUIRED",
    "application_tests_rerun": False,
}
(args.render_dir / "structural-check.json").write_text(
    json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
)
print(json.dumps(summary, ensure_ascii=False))
