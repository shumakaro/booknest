import type { Book } from "../types";
import { BookCard } from "./BookCard";
import { EmptyState } from "./EmptyState";

interface BookListProps {
  books: Book[];
  wishlistIds: Set<string>;
  onWishlistToggle: (book: Book) => void;
  onDetails: (book: Book, trigger: HTMLButtonElement) => void;
}

export function BookList({
  books,
  wishlistIds,
  onWishlistToggle,
  onDetails,
}: BookListProps) {
  if (books.length === 0) {
    return (
      <EmptyState
        title="Книги не найдены"
        message="Попробуйте изменить запрос или фильтры."
      />
    );
  }

  return (
    <section className="book-list">
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          inWishlist={wishlistIds.has(book.id)}
          onWishlistToggle={onWishlistToggle}
          onDetails={onDetails}
        />
      ))}
    </section>
  );
}