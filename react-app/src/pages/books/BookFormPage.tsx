import {
  Link,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";

import { Spinner } from "../../components/Spinner";
import { BookForm } from "../../features/books/components/BookForm";
import { useBookDetails } from "../../features/books/hooks/useBookDetails";

import type { BookFormValues } from "../../features/books/bookSchema";

export function BookFormPage() {
  const navigate =
    useNavigate();
  const location = useLocation();

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
    | Partial<BookFormValues>
    | undefined;

  if (
    mode === "edit" &&
    details
  ) {
    const record = details.record;
    defaultValues = {
      title: details.title,
      author: details.authors[0]?.name ?? "",
      isbn: record?.isbn ?? "",
      publisher: record?.publisher ?? "",
      language: record?.language ?? "",
      publicationYear: record?.year,
      editionYear: record?.edition_year ?? undefined,
      pages: record?.pages,
      totalCopies: record?.total_copies,
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
        )}`, { state: location.state },
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
        key={bookId ?? "create"}
        mode={mode}
        bookId={bookId}
        defaultValues={
          defaultValues
        }
        onSuccess={
          handleSuccess
        }
        onCancel={() => navigate(bookId ? `/books/${encodeURIComponent(bookId)}` : "/books", { state: location.state })}
      />

    </section>
  );
}
