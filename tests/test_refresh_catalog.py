"""Проверяет сохранение ID и отказ при изменении исходной учебной записи."""
import pytest
from app.models import Book
from tools.refresh_demo_catalog import refresh


def prepare(db_client, db, db_author):
    item = db_client.post('/api/v1/books', json={'title': 'Учебная книга', 'author_id': db_author.id,
                                               'year': 2000, 'total_copies': 3}).json()
    book = db.get(Book, item['id'])
    expected = {key: getattr(book, key) for key in ['id', 'title', 'author_id', 'year', 'edition_year', 'description', 'total_copies']}
    expected['author'] = db_author.name
    return book, {'items': [{'expected': expected, 'replacement': {
        'id': 'OL1W', 'title': 'Подтвержденное произведение', 'authors': ['Настоящий автор'],
        'year': 1990, 'cover_id': 123,
    }}]}


def test_refresh_preserves_id_and_copies(db_client, db, db_author):
    book, plan = prepare(db_client, db, db_author)
    original_id = book.id
    result = refresh(db, plan)
    assert result['replaced'] == 1 and result['before'] == result['after']
    assert result['protected_data_unchanged']
    assert book.id == original_id and book.total_copies == 3
    assert book.title == 'Подтвержденное произведение' and book.external_work_id == 'OL1W'


def test_refresh_refuses_modified_record(db_client, db, db_author):
    book, plan = prepare(db_client, db, db_author)
    plan['items'][0]['expected']['title'] = 'Уже другое название'
    with pytest.raises(AssertionError, match='изменилась'):
        refresh(db, plan)
    db.rollback()
    assert db_client.get(f'/api/v1/books/{book.id}').json()['title'] == 'Учебная книга'
