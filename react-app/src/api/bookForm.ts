import type { BookFormValues } from "../features/books/bookSchema";
import type { AuthorRead, BookCreate, BookRead, Page_AuthorRead_ } from "./generated";
import { apiFetch, ApiError, toUserMessage } from "./client";

export class BookFormApiError extends ApiError {
  fieldErrors?: Record<string, string>;
  constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message, status); this.fieldErrors = fieldErrors;
  }
}

function isbn13(value: string): string {
  // Старые формы разрешали ISBN-10. Преобразуем корректный ISBN-10 в ISBN-13.
  if (value.length === 13) return value;
  let checksum = 0;
  for (let index = 0; index < 10; index++) checksum += Number(value[index]) * (10 - index);
  if (value.length !== 10 || checksum % 11 !== 0) {
    throw new BookFormApiError("Проверьте ISBN", 422, { isbn: "Неверная контрольная цифра ISBN-10." });
  }
  const prefix = "978" + value.slice(0, 9);
  let sum = 0;
  for (let index = 0; index < 12; index++) sum += Number(prefix[index]) * (index % 2 === 0 ? 1 : 3);
  return prefix + String((10 - sum % 10) % 10);
}

async function findAuthor(name: string): Promise<AuthorRead | undefined> {
  const params = new URLSearchParams({ q: name, size: "100" });
  const result = await apiFetch<Page_AuthorRead_>(`/authors?${params}`);
  return result.items.find(author => author.name.toLocaleLowerCase() === name.toLocaleLowerCase());
}

export async function saveBook(data: BookFormValues, bookId?: string): Promise<{ id: string }> {
  try {
    const isbn = isbn13(data.isbn);
    let author = await findAuthor(data.author.trim());
    if (!author) {
      try { author = await apiFetch<AuthorRead>("/authors", { method: "POST", body: JSON.stringify({ name: data.author.trim() }) }); }
      catch (reason) {
        if (!(reason instanceof ApiError) || reason.status !== 409) throw reason;
        author = await findAuthor(data.author.trim());
        if (!author) throw reason;
      }
    }
    const payload: BookCreate = { title: data.title, author_id: author.id, isbn, year: data.publicationYear,
      edition_year: data.editionYear, publisher: data.publisher, language: data.language, pages: data.pages };
    const saved = await apiFetch<BookRead>(bookId ? `/books/${encodeURIComponent(bookId)}` : "/books",
      { method: bookId ? "PATCH" : "POST", body: JSON.stringify(payload) });
    return { id: String(saved.id) };
  } catch (reason) {
    if (reason instanceof BookFormApiError) throw reason;
    if (reason instanceof ApiError) {
      const fields: Record<string, string> = {};
      const aliases: Record<string, string> = { year: "publicationYear", edition_year: "editionYear", author_id: "author" };
      for (const detail of reason.details ?? []) {
        const key = String(detail.loc?.at(-1) ?? "");
        if (key && detail.msg) fields[aliases[key] ?? key] = detail.msg;
      }
      if (reason.status === 409) fields.isbn = reason.message;
      throw new BookFormApiError(toUserMessage(reason), reason.status, fields);
    }
    throw reason;
  }
}
