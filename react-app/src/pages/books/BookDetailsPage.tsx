import {
  Link,
  useParams,
} from "react-router-dom";

import { ErrorBox } from "../../components/ErrorBox";
import { Spinner } from "../../components/Spinner";
import { useBookDetails } from "../../features/books/hooks/useBookDetails";

export function BookDetailsPage() {
  const { bookId } =
    useParams<{
      bookId: string;
    }>();

  const {
    details,
    status,
    errorMessage,
    notFound,
    retry,
  } = useBookDetails(bookId);

  if (!bookId) {
    return (
      <section>
        <h2>Ошибка</h2>
        <p>Идентификатор книги не указан.</p>

        <Link to="/books">
          Вернуться в каталог
        </Link>
      </section>
    );
  }

  if (status === "loading") {
    return (
      <section>
        <h2>Загрузка книги</h2>

        <Spinner label="Загружаем информацию..." />
      </section>
    );
  }

  if (
    status === "error" &&
    notFound
  ) {
    return (
      <section>
        <h2>Книга не найдена</h2>

        <p role="alert">
          {errorMessage}
        </p>

        <Link to="/books">
          Вернуться в каталог
        </Link>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section>
        <h2>
          Не удалось загрузить книгу
        </h2>

        <ErrorBox
          message={errorMessage}
          onRetry={retry}
        />

        <Link to="/books">
          Вернуться в каталог
        </Link>
      </section>
    );
  }

  if (!details) {
    return null;
  }

  return (
    <article>
      <p>
        <Link to="/books">
          ← Вернуться в каталог
        </Link>
      </p>

      <h2>{details.title}</h2>

      <section>
        <h3>Авторы</h3>

        {details.authors.length > 0 ? (
          <ul>
            {details.authors.map(
              (author) => (
                <li key={author.id}>
                  {author.name}
                </li>
              ),
            )}
          </ul>
        ) : (
          <p>
            Информация об авторах отсутствует.
          </p>
        )}
      </section>

      <section>
        <h3>Описание</h3>

        <p>
          {details.description}
        </p>
      </section>

      <p>
        <Link
          to={`/books/${encodeURIComponent(
            bookId,
          )}/edit`}
        >
          Редактировать книгу
        </Link>
      </p>
    </article>
  );
}