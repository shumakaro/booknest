// Внешний поиск имеет свой контракт и не подменяет локальные числовые ID книг.
import { apiFetch } from "./client";
import type { Book } from "../types";

export interface ExternalBook {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  cover_id: number | null;
}

export interface ExternalPage {
  items: ExternalBook[];
  total: number;
  page: number;
  size: number;
  has_more: boolean;
}

export interface ExternalDetails extends ExternalBook {
  description: string;
  notice: string | null;
}

export function searchGlobalBooks(title: string, author: string, page: number, signal?: AbortSignal) {
  const params = new URLSearchParams({ title, author, page: String(page), size: "20" });
  return apiFetch<ExternalPage>(`/discover/books?${params}`, { signal });
}

export function getGlobalBook(id: string, signal?: AbortSignal) {
  return apiFetch<ExternalDetails>(`/discover/books/${encodeURIComponent(id)}`, { signal });
}

export function externalCard(book: ExternalBook): Book {
  // Здесь намеренно нет record: внешний результат не является экземпляром библиотеки.
  return { id: book.id, title: book.title, authors: book.authors,
    year: book.year ?? undefined, coverId: book.cover_id ?? undefined };
}
