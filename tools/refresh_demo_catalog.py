"""Заменяет только заранее проверенные учебные записи, сохраняя ID и все связи."""
import argparse
import hashlib
import json
from pathlib import Path

from sqlalchemy import create_engine, func, select, text
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import Author, Book


def refresh(db: Session, plan: dict) -> dict:
    # Snapshot из plan содержит точные прежние поля каждой заменяемой книги.
    changes = plan["items"]
    ids = [item["expected"]["id"] for item in changes]
    assert ids and len(ids) == len(set(ids))
    assert len({item["replacement"]["id"] for item in changes}) == len(changes)
    tables = ["books", "users", "loans", "wishlist_entries"]
    before = {table: db.scalar(text("SELECT count(*) FROM " + table)) for table in tables}
    # Хэши считаются внутри БД: пароли/пользователи не попадают в план или журнал.
    def protected():
        return [db.scalar(text("SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'')) FROM " + table + " t"))
                for table in ["users", "loans", "wishlist_entries"]]
    fingerprints = protected()
    for item in changes:
        expected, replacement = item["expected"], item["replacement"]
        book = db.scalar(select(Book).where(Book.id == expected["id"]).with_for_update())
        assert book and not book.deleted_at, "Учебная книга отсутствует или в архиве"
        values = {key: getattr(book, key) for key in expected if key != "author"}
        values["author"] = db.get(Author, book.author_id).name
        assert values == expected and book.external_work_id is None, "Запись изменилась после подготовки; обновление отменено"
        name = replacement["authors"][0]
        author = db.scalar(select(Author).where(func.lower(Author.name) == func.lower(name)))
        if author is None:
            author = Author(name=name)
            db.add(author)
            db.flush()
        book.title = replacement["title"]
        book.author_id = author.id
        book.year = book.edition_year = replacement["year"]
        book.external_work_id = replacement["id"]
        book.cover_id = replacement["cover_id"]
        book.language = "Не указано"
        book.description = ("Источник каталожной записи: https://openlibrary.org/works/" + replacement["id"]
                            + ". Количество страниц, язык и сведения о конкретном издании требуют уточнения библиотекарем.")
    db.flush()
    after = {table: db.scalar(text("SELECT count(*) FROM " + table)) for table in tables}
    assert before == after and fingerprints == protected(), "Изменились защищенные данные; транзакция отменяется"
    return {"replaced": len(changes), "before": before, "after": after, "protected_data_unchanged": True}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan", required=True)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    plan = json.loads(Path(args.plan).read_text(encoding="utf-8"))
    backup = Path(plan["database_backup"])
    snapshot = json.loads((backup / "before.json").read_text(encoding="utf-8"))
    assert hashlib.sha256((backup / "before.dump").read_bytes()).hexdigest() == snapshot["dump_sha256"]
    engine = create_engine(Settings().migration_url, isolation_level="REPEATABLE READ")
    with Session(engine) as db:
        result = refresh(db, plan)
        if args.apply:
            db.commit()
        else:
            db.rollback()
        result["applied"] = args.apply
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
