import { useState } from "react";

import {
  useForm,
  type SubmitHandler,
} from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import {
  BookFormApiError,
  saveBook,
} from "../../../api/bookForm";

import { useUnsavedChanges } from "../../../shared/hooks/useUnsavedChanges";

import {
  bookSchema,
  type BookFormValues,
} from "../bookSchema";

interface BookFormProps {
  mode: "create" | "edit";
  bookId?: string;
  defaultValues?: BookFormValues;
  onSuccess: () => void;
}

const CREATE_DEFAULTS: BookFormValues = {
  title: "",
  author: "",
  isbn: "",
  publisher: "",
  language: "Русский",
  publicationYear: 2020,
  editionYear: 2020,
  pages: 1,
};

export function BookForm({
  mode,
  bookId,
  defaultValues,
  onSuccess,
}: BookFormProps) {
  const [
    generalError,
    setGeneralError,
  ] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    formState: {
      errors,
      isSubmitting,
      isDirty,
    },
  } = useForm<BookFormValues>({
    resolver:
      zodResolver(bookSchema),

    defaultValues:
      defaultValues ??
      CREATE_DEFAULTS,
  });

  useUnsavedChanges(
    isDirty && !isSubmitting,
  );

  const onSubmit: SubmitHandler<
    BookFormValues
  > = async (data) => {
    setGeneralError("");

    try {
      await saveBook(
        data,
        bookId,
      );

      onSuccess();
    } catch (error) {
      if (
        error instanceof
        BookFormApiError
      ) {
        if (
          error.status === 422 &&
          error.fieldErrors
        ) {
          Object.entries(
            error.fieldErrors,
          ).forEach(
            ([field, message]) => {
              setError(
                field as keyof BookFormValues,
                {
                  type: "server",
                  message,
                },
              );
            },
          );

          return;
        }

        if (
          error.status === 409 &&
          error.fieldErrors?.isbn
        ) {
          setError("isbn", {
            type: "server",
            message:
              error.fieldErrors
                .isbn,
          });

          return;
        }

        setGeneralError(
          error.message,
        );

        return;
      }

      setGeneralError(
        "Не удалось сохранить книгу.",
      );
    }
  };

  return (
    <form
      onSubmit={
        handleSubmit(onSubmit)
      }
      noValidate
    >
      <div>
        <label htmlFor="title">
          Название
        </label>

        <input
          id="title"
          {...register("title")}
          aria-invalid={
            Boolean(errors.title)
          }
          aria-describedby={
            errors.title
              ? "title-error"
              : undefined
          }
        />

        {errors.title && (
          <p
            id="title-error"
            role="alert"
          >
            {errors.title.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="author">
          Автор
        </label>

        <input
          id="author"
          {...register("author")}
          aria-invalid={
            Boolean(errors.author)
          }
          aria-describedby={
            errors.author
              ? "author-error"
              : undefined
          }
        />

        {errors.author && (
          <p
            id="author-error"
            role="alert"
          >
            {errors.author.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="isbn">
          ISBN
        </label>

        <input
          id="isbn"
          {...register("isbn")}
          aria-invalid={
            Boolean(errors.isbn)
          }
          aria-describedby={
            errors.isbn
              ? "isbn-error"
              : undefined
          }
        />

        {errors.isbn && (
          <p
            id="isbn-error"
            role="alert"
          >
            {errors.isbn.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="publisher">
          Издательство
        </label>

        <input
          id="publisher"
          {...register("publisher")}
          aria-invalid={
            Boolean(
              errors.publisher,
            )
          }
          aria-describedby={
            errors.publisher
              ? "publisher-error"
              : undefined
          }
        />

        {errors.publisher && (
          <p
            id="publisher-error"
            role="alert"
          >
            {
              errors.publisher
                .message
            }
          </p>
        )}
      </div>

      <div>
        <label htmlFor="language">
          Язык
        </label>

        <input
          id="language"
          {...register("language")}
          aria-invalid={
            Boolean(
              errors.language,
            )
          }
          aria-describedby={
            errors.language
              ? "language-error"
              : undefined
          }
        />

        {errors.language && (
          <p
            id="language-error"
            role="alert"
          >
            {
              errors.language
                .message
            }
          </p>
        )}
      </div>

      <div>
        <label htmlFor="publicationYear">
          Год первой публикации
        </label>

        <input
          id="publicationYear"
          type="number"
          {...register(
            "publicationYear",
            {
              valueAsNumber:
                true,
            },
          )}
          aria-invalid={
            Boolean(
              errors.publicationYear,
            )
          }
          aria-describedby={
            errors.publicationYear
              ? "publicationYear-error"
              : undefined
          }
        />

        {errors.publicationYear && (
          <p
            id="publicationYear-error"
            role="alert"
          >
            {
              errors
                .publicationYear
                .message
            }
          </p>
        )}
      </div>

      <div>
        <label htmlFor="editionYear">
          Год издания
        </label>

        <input
          id="editionYear"
          type="number"
          {...register(
            "editionYear",
            {
              valueAsNumber:
                true,
            },
          )}
          aria-invalid={
            Boolean(
              errors.editionYear,
            )
          }
          aria-describedby={
            errors.editionYear
              ? "editionYear-error"
              : undefined
          }
        />

        {errors.editionYear && (
          <p
            id="editionYear-error"
            role="alert"
          >
            {
              errors.editionYear
                .message
            }
          </p>
        )}
      </div>

      <div>
        <label htmlFor="pages">
          Количество страниц
        </label>

        <input
          id="pages"
          type="number"
          {...register(
            "pages",
            {
              valueAsNumber:
                true,
            },
          )}
          aria-invalid={
            Boolean(errors.pages)
          }
          aria-describedby={
            errors.pages
              ? "pages-error"
              : undefined
          }
        />

        {errors.pages && (
          <p
            id="pages-error"
            role="alert"
          >
            {errors.pages.message}
          </p>
        )}
      </div>

      {generalError && (
        <p role="alert">
          {generalError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting
          ? "Сохранение..."
          : mode === "create"
            ? "Создать книгу"
            : "Сохранить изменения"}
      </button>

      {isDirty && (
        <p>
          Есть несохранённые изменения.
        </p>
      )}
    </form>
  );
}