import type { Book } from "../types";
import type { Page_BookRead_ } from "./generated";
import { fromApiBook } from "./books";
import { apiFetch } from "./client";

export async function getWishlist(): Promise<Book[]> {
  const result: Book[] = [];
  let page = 1;
  while (true) {
    const data = await apiFetch<Page_BookRead_>(`/wishlist?page=${page}&size=100`);
    result.push(...data.items.map(fromApiBook));
    if (result.length >= data.total || data.items.length === 0) return result;
    page += 1;
  }
}
export async function setWishlistSaved(bookId: string, saved: boolean): Promise<void> {
  await apiFetch<void>(`/wishlist/${encodeURIComponent(bookId)}`, { method: saved ? "POST" : "DELETE" });
}
export async function syncWishlist(book: Book): Promise<void> {
  await setWishlistSaved(book.id, false);
}
