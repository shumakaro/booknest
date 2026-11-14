"""Сохраняет проверяемую сводку настоящих запусков без секретов и личных данных."""

import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = ROOT / ".tools/lecture08"
OUT = ROOT / "docs/test-results/lecture-08"
OUT.mkdir(parents=True, exist_ok=True)


def read(name: str) -> dict:
    return json.loads((PRIVATE / name).read_text(encoding="utf-8-sig"))


def run_summary(filename: str) -> dict:
    data = read(filename)
    failures = [
        {"test": case["fullName"], "message": (
            "Test timed out in 5000ms"
            if any("timed out in 5000ms" in message for message in case.get("failureMessages", []))
            else "Неуспешная проверка; подробности в приватном исходном протоколе"
        )}
        for file in data["testResults"] for case in file["assertionResults"]
        if case["status"] == "failed"
    ]
    return {
        "total": data["numTotalTests"], "passed": data["numPassedTests"],
        "failed": data["numFailedTests"], "success": data["success"],
        "files": len(data["testResults"]), "failures": failures,
    }


runs = {
    "initial_parallel": run_summary("vitest.json"),
    "login_isolated": run_summary("login-retry.json"),
    "routing_added": run_summary("routing.json"),
    "final_full": run_summary("full-retry.json"),
}
assert runs["final_full"]["success"]
assert runs["final_full"]["total"] == 99 and runs["routing_added"]["total"] == 4
assert runs["login_isolated"]["success"]
lint = read("final-lint-result.json")
build = read("final-build-result.json")
assert lint["exit_code"] == build["exit_code"] == 0
types = read("explicit-any.json")
assert not types["any_keywords"]
health = read("health-retry-result.json")
http_status = (PRIVATE / "health-retry-status.txt").read_text(encoding="utf-8-sig").strip()
body = read("health-retry-body.json")
assert health["exit_code"] == 0 and http_status == "200" and body == {"status": "ok"}
answers = json.loads((ROOT / "docs/lectures/lecture-08.json").read_text(encoding="utf-8"))
original = json.loads((ROOT / "docs/course/odt/lectures.json").read_text(encoding="utf-8"))
assert len(answers["questions"]) == 10
for question in answers["questions"]:
    record = next(r for r in original["units"]["8"] if r["paragraph"] == question["source_paragraph"])
    assert question["question"] == record["text"]
    for ref in question["refs"]:
        line = (ROOT / ref["path"]).read_text(encoding="utf-8-sig").splitlines()[ref["line"] - 1]
        assert ref["marker"] in line
defense = json.loads((ROOT / "docs/audit/defense-docx-qa.json").read_text(encoding="utf-8"))
assert hashlib.sha256((ROOT / defense["document"]).read_bytes()).hexdigest() == defense["document_sha256"]
summary = {
    "date": "2026-11-14", "branch": "codex/lecture-08-materials", "baseline": "f9b1c8c",
    "cwd": "C:/Users/comp/Documents/booknest/react-app",
    "runs": runs, "lint": lint, "build": build,
    "final_test_command": read("full-retry-result.json"),
    "initial_test_command": read("test-result.json"),
    "explicit_typescript_any": types,
    "health_first_attempt": read("health-result.json"),
    "health_retry": {**health, "http_status": 200, "body": body},
    "public_health_scope": "read-only /health only; no authentication or full production acceptance",
    "questions_verified": 10,
    "code_references_verified": sum(len(q["refs"]) for q in answers["questions"]),
    "defense_docx_unchanged": True, "backend_tests_rerun": False,
    "database_writes": False, "deployment_performed": False,
}
(ROOT / "docs/lectures/lecture-08-validation.json").write_text(
    json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
lines = ["# Извлечение результатов Vitest лекции 8", "",
         "Это извлечение из настоящих JSON-протоколов, не имитация вывода терминала.",
         "Первые 95 тестов запускались параллельно с lint/build: один timeout 5000 ms.",
         "Изолированный Login и полный повтор не меняли timeout или утверждения тестов.",
         "Финальная команда: " + summary["final_test_command"]["command"], ""]
for label, filename in [("Первый параллельный", "vitest.json"), ("Login отдельно", "login-retry.json"),
                        ("Новые маршруты", "routing.json"), ("Полный повтор", "full-retry.json")]:
    data = read(filename)
    lines += [f"## {label}: passed={data['numPassedTests']}, failed={data['numFailedTests']}", ""]
    for file in data["testResults"]:
        relative = Path(file["name"]).relative_to(ROOT).as_posix()
        for case in file["assertionResults"]:
            lines.append(f"{case['status']}: {relative} :: {case['fullName'].strip()}")
    lines.append("")
(OUT / "vitest.txt").write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
for source, target in [("final-build.log", "build.txt"), ("final-lint.log", "lint.txt")]:
    log = (PRIVATE / source).read_text(encoding="utf-8-sig")
    log = re.sub(r"\x1b\[[0-9;]*m", "", log)
    (OUT / target).write_text(log.rstrip() + "\n", encoding="utf-8")
print(json.dumps({"final_tests": runs["final_full"], "questions": 10,
                  "references": summary["code_references_verified"], "health": 200}, ensure_ascii=False))
