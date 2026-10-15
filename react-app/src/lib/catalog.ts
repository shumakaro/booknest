import type {
  Book,
  SortOption,
} from "../types";

// Возвращает отфильтрованный и отсортированный список книг.
export function getVisibleBooks(
  books: Book[],
  sort: SortOption,
  onlyWithCover: boolean,
): Book[] {
  const filtered = onlyWithCover
    ? books.filter(
        (book) =>
          book.coverId !== undefined,
      )
    : books;

  if (sort === "relevance") {
    return filtered;
  }

  // Сортируем копию массива, чтобы не менять state напрямую.
  return [...filtered].sort(
    (first, second) => {
      switch (sort) {
        case "title-asc":
          return first.title.localeCompare(
            second.title,
            "ru",
          );

        case "title-desc":
          return second.title.localeCompare(
            first.title,
            "ru",
          );

        case "year-asc":
          return (
            (first.year ?? 0) -
            (second.year ?? 0)
          );

        case "year-desc":
          return (
            (second.year ?? 0) -
            (first.year ?? 0)
          );
      }
    },
  );
}