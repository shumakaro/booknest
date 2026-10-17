interface BookPayload {
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  language: string;
  publicationYear: number;
  editionYear: number;
  pages: number;
}

export class BookFormApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(
    message: string,
    status: number,
    fieldErrors?: Record<string, string>,
  ) {
    super(message);

    this.name = "BookFormApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function delay(
  milliseconds: number,
): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(
      resolve,
      milliseconds,
    );
  });
}

export async function saveBook(
  data: BookPayload,
  bookId?: string,
): Promise<{ id: string }> {
  await delay(900);

  if (
    data.title
      .toLowerCase()
      .includes("server error")
  ) {
    throw new BookFormApiError(
      "Внутренняя ошибка сервера.",
      500,
    );
  }

  if (
    data.title
      .toLowerCase()
      .includes("invalid")
  ) {
    throw new BookFormApiError(
      "Сервер отклонил данные формы.",
      422,
      {
        title:
          "Сервер не принимает это название.",
        publisher:
          "Проверьте название издательства.",
      },
    );
  }

  if (
    data.isbn ===
    "9780000000000"
  ) {
    throw new BookFormApiError(
      "Книга с таким ISBN уже существует.",
      409,
      {
        isbn:
          "Этот ISBN уже используется другой книгой.",
      },
    );
  }

  return {
    id:
      bookId ??
      `local-${Date.now()}`,
  };
}