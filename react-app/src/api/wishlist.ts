import type { Book } from "../types";

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

export async function syncWishlist(
  book: Book,
): Promise<void> {
  await delay(500);

  if (
    book.title
      .toLowerCase()
      .includes("error")
  ) {
    throw new Error(
      "Не удалось синхронизировать список желаемого.",
    );
  }
}