"""Учебное наполнение после миграций, без удаления существующих данных."""
from datetime import date, timedelta
from sqlalchemy import select
from app.db import get_session_factory
from app.models import Author, Book, Genre, Loan, Profile, User

def main() -> None:
    with get_session_factory()() as db:
        if db.scalar(select(Book.id).limit(1)) is not None:
            print('В каталоге уже есть данные; повторное наполнение пропущено')
            return
        authors = [Author(name=f'Автор {number}',birth_year=1900+number) for number in range(1,6)]
        genres = [Genre(code=code,name=name) for code,name in [('scifi','Фантастика'),('history','История'),('poetry','Поэзия'),('cs','Информатика'),('fiction','Проза')]]
        users = [User(email=f'reader{number}@example.test',password_hash='disabled-training-account',is_active=False) for number in range(1,11)]
        db.add_all(authors+genres+users)
        db.flush()
        books = []
        for number in range(1,31):
            book=Book(title=f'Книга {number:02}',author_id=authors[(number-1)%5].id,year=1990+number,edition_year=1990+number,total_copies=3,description=f'Учебная запись {number}',genres=[genres[(number-1)%5]])
            books.append(book)
        db.add_all(books)
        db.flush()
        for number,user in enumerate(users,1):
            db.add(Profile(user_id=user.id,first_name='Читатель',last_name=str(number),faculty='Учебный факультет'))
        for number in range(1,21):
            db.add(Loan(book_id=books[number-1].id,user_id=users[(number-1)%8].id,issued_at=date.today()-timedelta(days=30),due_date=date.today()-timedelta(days=10),returned_at=date.today()-timedelta(days=15) if number%2==0 else None))
        db.commit()
        print('Созданы 5 авторов, 30 книг, 5 жанров, 10 неактивных пользователей, 20 выдач')

if __name__ == '__main__':
    main()
