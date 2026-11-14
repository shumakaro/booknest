"""Готовит единый источник лекций, сохраняя дословные вопросы и реальные статусы.

Старые ответы не объявляются новыми измерениями. Рабочая база и приложение
не меняются; практические занятия оформляются следующим отдельным этапом.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs/lectures"


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def load(path: str) -> dict:
    return json.loads(read(path))


TOPICS = {
    10: ("PostgreSQL и проектирование данных",
         "db/README.md", "db/schema.sql", "db/queries.sql", "db/benchmark.sql",
         "В новой локальной проверке: 7 базовых таблиц, 28 ограничений, 30 книг, все 12 SQL-запросов выполнены. "
         "Планы на 500000 строк сохранены ранее: B-tree 68,771 → 0,111 мс; GIN 409,101 → 0,190 мс. "
         "Это отдельный benchmark_books, а не новый замер Render или главного экрана. "
         "Связи 1:1 users/profiles, 1:N authors/books и M:N books/book_genres/genres."),
    11: ("SQLAlchemy репозитории и миграции",
         "docs/lectures/lecture-10-11-schema-comparison.md", "app/models.py",
         "app/repositories/catalog.py", "app/services/catalog.py",
         "Начальный DDL сравнен с реально примененной 001_schema по столбцам, типам, NULL, значениям по умолчанию, identity и ограничениям. "
         "Далее выполнен upgrade до 006, alembic check, downgrade до 001 и повторный upgrade; имена с повторными и конечными пробелами сохранены. "
         "Логи N+1 26 SELECT → 3 SELECT являются прежними измерениями на 20 книгах, а не новым замером."),
    12: ("Безопасность аутентификация и права",
         "docs/security-review.md", "app/core/security.py", "app/core/auth.py", "app/routers/auth.py",
         "Чек-лист содержит все 15 пунктов, статусы, ссылки на строки и известные исправления. "
         "Владение и роль проверяются сервером, а не только содержимым JWT или скрытием кнопки. "
         "Полный secret-scan истории, ручная проверка production-cookie и внешний аудит остаются открыты. "
         "Рабочие секреты для отчета не извлекаются."),
    13: ("Интеграция обработка ошибок и тесты",
         "README.md", "app/core/http.py", "react-app/src/api/client.ts", "tests/conftest.py",
         "Сохраненный полный CI 43599915876 на 809f061 завершился success: backend на одноразовом PostgreSQL, "
         "frontend test/lint/build и контейнерный профиль. Локальный протокол лекции 9 содержит 44 passed и 11 HTTP-сценариев в памяти. "
         "Результаты разных прогонов не складываются в число уникальных тестов. .env.example описывает параметры без настоящих секретов."),
    14: ("Docker Compose и развертывание",
         ".github/workflows/ci.yml", "docker-compose.yml", "docker/api.Dockerfile", "react-app/Dockerfile",
         "Четыре основных сервиса Compose: db, api, seed, web. Успешный сохраненный CI 43599915876 проверил чистый запуск, "
         "оба варианта образов, persistence, backup/restore в новую БД, браузерный сценарий и ограничитель за proxy. "
         "В Render используется единый образ docker/render.Dockerfile и внешняя Neon; этот вариант отличается от Compose. "
         "Удаление рабочих томов, system prune и новое развертывание не выполнялись."),
    15: ("Code Review самооценка и подготовка защиты",
         "docs/lectures/lecture-15-self-assessment.md", "docs/lab12/defense.md",
         "docs/lab12/architecture.pptx", "docs/audit/stages-progress.md",
         "Подготовлена аргументированная предварительная самооценка по всем 12 официальным критериям. "
         "Оценка не выдается за решение преподавателя или проведенную устную защиту. "
         "Исключенное взаимное ревью не заменяется вымышленными комментариями. "
         "Пользовательские кадры и личная демонстрация остаются отдельным этапом."),
}

REFERENCES = {
    10: [("PostgreSQL EXPLAIN", "https://www.postgresql.org/docs/current/using-explain.html")],
    11: [("SQLAlchemy relationship loading", "https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html")],
    12: [("OWASP Password Storage", "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html")],
}


def main() -> None:
    """Собирает 82 ответа и исходные пункты домашних заданий."""
    source = load("docs/course/odt/lectures.json")
    audit = load("docs/audit/requirements-matrix.json")
    answers = load("docs/course/lecture-answers.json")
    # Исправляются конкретные устаревшие сведения, а не история прежних отчетов.
    answers["15"][6] = (
        "У BookNest остаются три проверяемых ограничения. AppLayout в shared зависит от app/features: "
        "его следует перенести в композиционный слой app. Ограничитель запросов хранится в памяти процесса: "
        "при нескольких экземплярах понадобится общее хранилище. Публичный Lighthouse и ручная проверка "
        "production-cookie еще не выполнены: их нужно провести по окончательному чек-листу. "
        "Публичный HTTPS Render уже существует; отсутствие HTTPS больше не называется недостатком.")
    password_note = (
        " В BookNest сохранен bcrypt по методичке. Для нового проекта OWASP предпочитает Argon2id; "
        "смена алгоритма требует отдельного совместимого перехода, а не удаления существующих хешей.")
    if password_note not in answers["12"][1]:
        answers["12"][1] += password_note
    error_note = (
        " В BookNest этот конверт применяется к обработчикам API; CORS preflight может вернуть отдельный текстовый ответ middleware.")
    if error_note not in answers["13"][3]:
        answers["13"][3] += error_note
    answers["15"][7] = (
        "Вариант дальнейшего изучения — TanStack Query для кэширования и обновления серверных данных. "
        "Сначала следует понять собственные хуки загрузки и их ограничения. Это предложенный учебный вариант; "
        "личный выбор и его обоснование студент подтверждает самостоятельно.")
    answers["13"][0] = (
        "Можно разрешить отдельный origin через CORS, использовать dev-proxy Vite или поставить общий reverse proxy. "
        "В разработке proxy дает относительные запросы и один origin в браузере. В Compose Nginx раздает SPA и проксирует API. "
        "На Render применяется единый образ FastAPI со статикой React и внешней Neon. CORS нужен для явно разрешенных других origins.")
    units = []
    for number in range(8, 16):
        if number < 10:
            existing = load(f"docs/lectures/lecture-{number:02}.json")
            questions = existing["questions"]
            title = existing["title"]
            theory = "Подробные ответы и подтверждения этого раздела сохранены на предыдущих этапах и включены в общий сборник."
            refs = []
        else:
            info = TOPICS[number]
            title, theory, refs = info[0], info[-1], list(info[1:-1])
            questions = []
            rows = [r for r in audit["rows"] if r["id"].startswith(f"L{number}-Q")]
            assert len(rows) == len(answers[str(number)])
            for row, answer in zip(rows, answers[str(number)], strict=True):
                original = next(r for r in source["units"][str(number)] if r["paragraph"] == row["source_paragraph"])
                question = re.sub(r"^\d+\.\s*", "", original["text"])
                # Ответы прежней работы уточняются связью с действующей реализацией.
                short = ". ".join(re.split(r"\.\s+", answer)[:2]).rstrip(".") + "."
                questions.append({"id": row["id"], "number": len(questions) + 1, "question": question,
                                  "source_paragraph": original["paragraph"], "answer": answer,
                                  "oral": short, "booknest": theory,
                                  "refs": [{"path": p, "line": 1} for p in refs[:2]]})
        homework = [r for r in audit["rows"] if r["id"].startswith(f"L{number:02}-HW")]
        units.append({"number": number, "title": title, "theory": theory,
                      "questions": questions, "homework": homework, "files": refs})
    assert sum(len(u["questions"]) for u in units) == 82
    for u in units:
        for q in u["questions"]:
            assert len(q["answer"]) >= 100 and q["oral"] and q["question"]
            for ref in q["refs"]:
                assert (ROOT / ref["path"]).is_file()
        for path in u["files"]:
            assert (ROOT / path).is_file()
    data = {"title": "BookNest Лекции 8 15", "date": "2026-11-14",
            "branch": "codex/lectures-08-15-handbook", "source_sha256": source["sha256"],
            "question_count": 82, "units": units, "references": REFERENCES,
            "screenshots_pending": True, "peer_tasks_excluded": True}
    (OUT / "lectures-08-15.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    md = ["# BookNest Лекции 8 15", "",
          "Единый учебный отчет: контрольные вопросы, ответы, домашние задания и связь с существующим проектом. "
          "Практические занятия 8–15 оформляются отдельным следующим документом. Взаимные задания исключены по согласованию. "
          "Скриншоты и личная демонстрация не подменяются текстовым утверждением об успехе.", ""]
    for unit in units:
        md += [f"## Лекция {unit['number']} {unit['title']}", "", unit["theory"], ""]
        for q in unit["questions"]:
            md += [f"### Вопрос {q['number']}", "", q["question"], "",
                   "**Подробный ответ.** " + q["answer"], "",
                   "**Краткий ответ.** " + q["oral"], "",
                   "**Код и подтверждения.** " + "; ".join(f"{r['path']}:{r['line']}" for r in q["refs"]), ""]
        md += ["### Домашнее задание", ""]
        for row in unit["homework"]:
            md += [row["id"] + " — " + row["requirement"], "",
                   "Статус: " + row["status"] + ". " + row["check"] + " " + row["note"], "",
                   "Подтверждения: " + "; ".join(row["files"]), ""]
    (OUT / "lectures-08-15.md").write_text("\n".join(line.rstrip() for line in md), encoding="utf-8")
    # Обновление затрагивает только конкретные проверенные ответы 10–15.
    (ROOT / "docs/course/lecture-answers.json").write_text(
        json.dumps(answers, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"lectures": len(units), "questions": 82,
                      "homework_items": sum(len(u["homework"]) for u in units)}))


if __name__ == "__main__":
    main()
