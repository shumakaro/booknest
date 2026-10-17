import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import { Spinner } from "../../components/Spinner";
import { BookForm } from "../../features/books/components/BookForm";
import { useBookDetails } from "../../features/books/hooks/useBookDetails";

import type { BookFormValues } from "../../features/books/bookSchema";

export function BookFormPage() {
  const navigate =
    useNavigate();

  const { bookId } =
    useParams<{
      bookId: string;
    }>();

  const mode =
    bookId
      ? "edit"
      : "create";

  const {
    details,
    status,
    errorMessage,
    notFound,
  } = useBookDetails(
    bookId,
  );

  if (
    mode === "edit" &&
    status === "loading"
  ) {
    return (
      <section>
        <h2>
          Редактирование книги
        </h2>

        <Spinner label="Загружаем данные книги..." />
      </section>
    );
  }

  if (
    mode === "edit" &&
    status === "error"
  ) {
    return (
      <section>
        <h2>
          {notFound
            ? "Книга не найдена"
            : "Ошибка загрузки"}
        </h2>

        <p role="alert">
          {errorMessage}
        </p>

        <Link to="/books">
          Вернуться в каталог
        </Link>
      </section>
    );
  }

  let defaultValues:
    | BookFormValues
    | undefined;

  if (
    mode === "edit" &&
    details
  ) {
    defaultValues = {
      title:
        details.title,

      author:
        details.authors[0]
          ?.name ??
        "Автор не указан",

      isbn:
        "1234567890",

      publisher:
        "Open Library",

      language:
        "Английский",

      publicationYear:
        2000,

      editionYear:
        2000,

      pages:
        200,
    };
  }

  function handleSuccess() {
    if (
      mode === "edit" &&
      bookId
    ) {
      navigate(
        `/books/${encodeURIComponent(
          bookId,
        )}`,
      );

      return;
    }

    navigate("/books");
  }

  return (
    <section>
      <h2>
        {mode === "create"
          ? "Добавление книги"
          : "Редактирование книги"}
      </h2>

      <BookForm
        mode={mode}
        bookId={bookId}
        defaultValues={
          defaultValues
        }
        onSuccess={
          handleSuccess
        }
      />

      <p>
        <Link to="/books">
          Отмена
        </Link>
      </p>
    </section>
  );
}