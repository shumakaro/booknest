"""Проверяет полноту учета источников, а не подменяет выполнение учебных заданий."""

from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
audit = json.loads((ROOT / "docs/audit/requirements-matrix.json").read_text(encoding="utf-8"))
rows = audit["rows"]
assert len(rows) == len({r["id"] for r in rows})
assert Counter(r["status"] for r in rows) == audit["counts"]
allowed = {"DONE", "PARTIAL", "MISSING", "BLOCKED", "NOT_VERIFIED", "EXCLUDED_PEER_TASK"}
assert all(r["status"] in allowed for r in rows)
assert len(audit["source_inventory"]) == 16
numbered = 0
for kind, expected in [("lecture", 1511), ("practice", 219)]:
    source = json.loads((ROOT / f"docs/course/odt/{kind}s.json").read_text(encoding="utf-8"))
    assert source["paragraphs"] == expected
    assert source["tables"] == source["images"] == source["embedded_objects"] == 0
    assert set(source["units"]) == {str(i) for i in range(8, 16)}
    original = Path("C:/Users/comp/Desktop") / source["source"]
    assert hashlib.sha256(original.read_bytes()).hexdigest() == source["sha256"]
    for week, records in source["units"].items():
        unit_rows = [r for r in rows if r["unit"] == f"{kind}-{int(week):02}"]
        by_paragraph = {r["paragraph"]: r for r in records}
        for record in records:
            if record["list_kind"] == "number":
                numbered += 1
                matches = [r for r in unit_rows if r["source_paragraph"] == record["paragraph"]]
                assert matches, (kind, week, record["paragraph"])
                assert any(r["original_number"] == record["list_ordinal"] for r in matches)
        for row in unit_rows:
            if row["source_paragraph"] is None:
                continue  # Индивидуальное уточнение мастер-промпта, не цитата ODT.
            original_text = by_paragraph[row["source_paragraph"]]["text"]
            assert row["requirement"] in original_text, row["id"]
            if row["status"] == "DONE":
                assert row["files"] and row["check"], row["id"]
assert numbered == 204
assert len([r for r in rows if re.fullmatch(r"L\d+-Q\d+", r["id"])]) == 82
assert len([r for r in rows if re.fullmatch(r"P\d+-STEP\d+", r["id"])]) == 65
assert len([r for r in rows if r["row_kind"] == "CODE_EXAMPLE"]) == 28
assert len([r for r in rows if r["row_kind"] == "SOURCE_CONTEXT"]) == 57
assert len([r for r in rows if r["id"].startswith("P15-OWN")]) == 8
for row in rows:
    for file in row["files"]:
        assert (ROOT / file).is_file(), (row["id"], file)
for sha in sorted({sha for row in rows for sha in row["commits"]}):
    result = subprocess.run(
        ["git", "cat-file", "-t", sha], cwd=ROOT, capture_output=True, text=True, check=True
    )
    assert result.stdout.strip() == "commit", sha
result = subprocess.run(
    ["git", "diff", "cc256a7", "--name-only", "--", "app", "react-app", "db",
     "migrations", "docker", ".github", "docs/reports"],
    cwd=ROOT, capture_output=True, text=True, check=True,
)
assert not result.stdout.strip(), "Аудит не должен менять приложение или прежние DOCX"
defense = json.loads((ROOT / "docs/audit/defense-docx-qa.json").read_text(encoding="utf-8"))
assert hashlib.sha256((ROOT / defense["document"]).read_bytes()).hexdigest() == defense["document_sha256"]
summary = {
    "date": "2026-11-14", "status": "AUDIT_STRUCTURE_OK",
    "source_paragraphs": 1730, "source_units": 16, "source_hashes_match": True,
    "numbered_items_covered": numbered, "lecture_questions": 82,
    "practice_steps": 65, "code_examples_reviewed_statically": 28,
    "source_context_items": 57, "matrix_rows": len(rows),
    "matrix_counts": audit["counts"], "own_practice15_tasks": 8,
    "application_files_unchanged": True, "defense_docx_unchanged": True,
    "new_application_tests_run": False,
}
(ROOT / "docs/audit/course-audit-validation.json").write_text(
    json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
print(json.dumps(summary, ensure_ascii=False))
