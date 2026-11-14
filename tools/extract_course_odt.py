"""Извлечение методичек с сохранением исходного текста и нумерации списков."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
from zipfile import ZipFile

TEXT = "urn:oasis:names:tc:opendocument:xmlns:text:1.0"
STYLE = "urn:oasis:names:tc:opendocument:xmlns:style:1.0"
TABLE = "urn:oasis:names:tc:opendocument:xmlns:table:1.0"


def content(element: ET.Element) -> str:
    """Пробелы ODT, табуляция и переводы строк важны в примерах кода."""
    result = element.text or ""
    for child in element:
        if child.tag == f"{{{TEXT}}}s":
            result += " " * int(child.get(f"{{{TEXT}}}c", "1"))
        elif child.tag == f"{{{TEXT}}}tab":
            result += "\t"
        elif child.tag == f"{{{TEXT}}}line-break":
            result += "\n"
        else:
            result += content(child)
        result += child.tail or ""
    return result


def extract(source: Path, kind: str, output: Path) -> dict:
    """Порядковые номера абзацев служат стабильными ссылками внутри источника."""
    with ZipFile(source) as archive:
        root = ET.fromstring(archive.read("content.xml"))
        names = archive.namelist()
    parents = {child: parent for parent in root.iter() for child in parent}
    styles = {
        e.get(f"{{{STYLE}}}name"): e
        for e in root.iter(f"{{{TEXT}}}list-style")
    }
    units: dict[int, list] = {}
    current = None
    paragraphs = [e for e in root.iter() if e.tag in {f"{{{TEXT}}}p", f"{{{TEXT}}}h"}]
    for index, element in enumerate(paragraphs, 1):
        value = content(element)
        match = re.match(r"^(?:Лекция|Практика)\s+(\d+)\s*·", value)
        if match:
            current = int(match.group(1))
            units[current] = []
        item = element
        while item in parents and item.tag != f"{{{TEXT}}}list-item":
            item = parents[item]
        ordinal, list_kind, list_style = None, None, None
        if item.tag == f"{{{TEXT}}}list-item":
            owner = parents[item]
            list_style = owner.get(f"{{{TEXT}}}style-name")
            siblings = [e for e in owner if e.tag == item.tag]
            number = 0
            for sibling in siblings:
                number = int(sibling.get(f"{{{TEXT}}}start-value", str(number + 1)))
                if sibling is item:
                    ordinal = number
                    break
            definition = styles.get(list_style)
            if definition is not None:
                first = next(iter(definition), None)
                list_kind = "number" if first is not None and first.tag.endswith("style-number") else "bullet"
        record = {
            "paragraph": index, "text": value, "style": element.get(f"{{{TEXT}}}style-name"),
            "list_ordinal": ordinal, "list_kind": list_kind, "list_style": list_style,
        }
        if current is not None:
            units[current].append(record)
    assert set(units) == set(range(8, 16)), "Ожидаются все восемь недель"
    payload = {
        "source": source.name, "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "paragraphs": len(paragraphs),
        "tables": sum(e.tag == f"{{{TABLE}}}table" for e in root.iter()),
        "images": len([n for n in names if n.startswith("Pictures/") and not n.endswith("/")]),
        "embedded_objects": len([n for n in names if n.startswith("Object") and n.endswith("content.xml")]),
        "units": units,
    }
    output.mkdir(parents=True, exist_ok=True)
    for number, records in units.items():
        lines = []
        for record in records:
            prefix = f"{record['list_ordinal']}. " if record["list_kind"] == "number" else ""
            # В JSON текст дословный; TXT не добавляет хвостовой пробел
            # после номера пустого абзаца.
            lines.append(f"[{record['paragraph']}] {prefix}{record['text']}".rstrip())
        (output / f"{kind}-{number:02}.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    (output / f"{kind}s.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {key: value for key, value in payload.items() if key != "units"}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, default=Path("C:/Users/comp/Desktop"))
    parser.add_argument("--output-dir", type=Path, default=Path("docs/course/odt"))
    args = parser.parse_args()
    for filename, kind in [("веблекц.odt", "lecture"), ("вебпр.odt", "practice")]:
        print(json.dumps(extract(args.source_dir / filename, kind, args.output_dir), ensure_ascii=False))


if __name__ == "__main__":
    main()
