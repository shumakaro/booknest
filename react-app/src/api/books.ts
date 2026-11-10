import type { BookRead, Page_BookRead_ } from "./generated";
import type { Book, BookDetails, SearchResult } from "../types";
import { apiFetch } from "./client";

// Внутренние компоненты сохраняют прежний строковый id, а API использует числовой.
export function fromApiBook(item: BookRead): Book {
  return { id: String(item.id), title: item.title, authors: [item.author], year: item.year,
    coverId: item.cover_id ?? undefined, record: item };
}

export async function searchBooks(query: string, page: number, signal?: AbortSignal,
  filters: { sort?: string; genre?: string; availableOnly?: boolean } = {}): Promise<SearchResult> {
  const params = new URLSearchParams({ q: query, page: String(page), size: "20", sort: filters.sort ?? "title" });
  if (filters.genre) params.set("genre", filters.genre);
  if (filters.availableOnly) params.set("available_only", "true");
  const result = await apiFetch<Page_BookRead_>(`/books?${params}`, { signal });
  return { docs: result.items.map(fromApiBook), total: result.total };
}

export async function getBookDetailsById(bookId: string, signal?: AbortSignal): Promise<BookDetails> {
  const data = await apiFetch<BookRead>(`/books/${encodeURIComponent(bookId)}`, { signal });
  return { id: String(data.id), title: data.title, description: data.description ?? "",
    authors: [{ id: String(data.author_id), name: data.author }], record: data };
}

export async function getBookDetails(book: Book, signal?: AbortSignal): Promise<BookDetails> {
  return getBookDetailsById(book.id, signal);
}
