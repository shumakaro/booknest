import type { Book } from "../types";
import { BookCard } from "./BookCard";
import { EmptyState } from "./EmptyState";

interface WishlistPanelProps {
  books: Book[];
  onRemove: (book: Book) => void;
  onDetails: (book: Book, trigger: HTMLButtonElement) => void;
}

// Список желаемого получает данные через props.
// Сам компонент не хранит отдельную копию массива.
export function WishlistPanel({
  books,
  onRemove,
  onDetails,
}: WishlistPanelProps) {
  if (books.length === 0) {
    return (
      <EmptyState
        title="Список желаемого пуст"
        message="Добавьте книги из каталога."
      />
    );
  }

  return (
    <section>
      <h2>Список желаемого</h2>

      <div className="book-list">
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            inWishlist
            onWishlistToggle={onRemove}
            onDetails={onDetails}
          />
        ))}
      </div>
    </section>
  );
}