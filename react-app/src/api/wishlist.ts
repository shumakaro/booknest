import type { Book } from "../types";
import type { Page_BookRead_ } from "./generated";
import { fromApiBook } from "./books";
import { apiFetch } from "./client";

export async function getWishlist(signal?: AbortSignal): Promise<Book[]> {
  // Читаются все страницы пользователя, а не только первые сто записей.
  const result = new Map<string, Book>();
  let loaded = 0;
  let page = 1;
  while (true) {
    if (signal?.aborted) throw new DOMException("Запрос отменен", "AbortError");
    const data = await apiFetch<Page_BookRead_>(`/wishlist?page=${page}&size=100`, { signal });
    if (signal?.aborted) throw new DOMException("Запрос отменен", "AbortError");
    for (const item of data.items.map(fromApiBook)) result.set(item.id, item);
    loaded += data.items.length;
    if (loaded >= data.total || data.items.length === 0) return [...result.values()];
    page += 1;
  }
}
export async function setWishlistSaved(bookId: string, saved: boolean): Promise<void> {
  await apiFetch<void>(`/wishlist/${encodeURIComponent(bookId)}`, { method: saved ? "POST" : "DELETE" });
}
export async function syncWishlist(book: Book): Promise<void> {
  await setWishlistSaved(book.id, false);
}
