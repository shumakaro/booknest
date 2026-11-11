import type { BookFormValues } from "../features/books/bookSchema";
import type { AuthorRead, BookUpdate, BookRead, Page_AuthorRead_ } from "./generated";
import { apiFetch, ApiError, toUserMessage } from "./client";
import { normalizeIsbn } from "../features/books/isbn";

export class BookFormApiError extends ApiError {
  fieldErrors?: Record<string, string>;
  constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message, status); this.fieldErrors = fieldErrors;
  }
}

async function findAuthor(name: string): Promise<AuthorRead | undefined> {
  const params = new URLSearchParams({ q: name, size: "100" });
  const result = await apiFetch<Page_AuthorRead_>(`/authors?${params}`);
  return result.items.find(author => author.name.toLocaleLowerCase() === name.toLocaleLowerCase());
}

export async function saveBook(data: BookFormValues, bookId?: string, changed?: (keyof BookFormValues)[]): Promise<{ id: string }> {
  try {
    let isbn: string | null;
    try { isbn = normalizeIsbn(data.isbn); }
    catch (error) { throw new BookFormApiError("Проверьте ISBN", 422, { isbn: (error as Error).message }); }
    // PATCH отправляет только измененные поля и не создает автора при правке страниц.
    const needsAuthor = !bookId || !changed || changed.includes("author");
    let author = needsAuthor ? await findAuthor(data.author.trim()) : undefined;
    if (needsAuthor && !author) {
      try { author = await apiFetch<AuthorRead>("/authors", { method: "POST", body: JSON.stringify({ name: data.author.trim() }) }); }
      catch (reason) {
        if (!(reason instanceof ApiError) || reason.status !== 409) throw reason;
        author = await findAuthor(data.author.trim());
        if (!author) throw reason;
      }
    }
    let payload: BookUpdate = { title: data.title, isbn, year: data.publicationYear,
      edition_year: data.editionYear, publisher: data.publisher, language: data.language, pages: data.pages };
    if (author) payload.author_id = author.id;
    if (data.totalCopies !== undefined) payload.total_copies = data.totalCopies;
    if (bookId && changed) {
      const aliases: Record<string, string> = { author: "author_id", publicationYear: "year", editionYear: "edition_year", totalCopies: "total_copies" };
      const keys = new Set(changed.map(field => aliases[field] ?? field));
      payload = Object.fromEntries(Object.entries(payload).filter(([field]) => keys.has(field)));
      if (!Object.keys(payload).length) return { id: bookId };
    }
    const saved = await apiFetch<BookRead>(bookId ? `/books/${encodeURIComponent(bookId)}` : "/books",
      { method: bookId ? "PATCH" : "POST", body: JSON.stringify(payload) });
    return { id: String(saved.id) };
  } catch (reason) {
    if (reason instanceof BookFormApiError) throw reason;
    if (reason instanceof ApiError) {
      const fields: Record<string, string> = {};
      const aliases: Record<string, string> = { year: "publicationYear", edition_year: "editionYear", author_id: "author", total_copies: "totalCopies" };
      for (const detail of reason.details ?? []) {
        const key = String(detail.loc?.at(-1) ?? "");
        if (key && detail.msg) fields[aliases[key] ?? key] = detail.msg;
      }
      if (reason.status === 409 && /isbn/i.test(reason.message)) fields.isbn = reason.message;
      throw new BookFormApiError(toUserMessage(reason), reason.status, fields);
    }
    throw reason;
  }
}
