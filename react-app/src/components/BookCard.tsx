import type { Book } from "../types";
import { Badge } from "./Badge";
import { Button } from "./Button";

interface BookCardProps {
  book: Book;
  inWishlist: boolean;
  onWishlistToggle: (book: Book) => void;
  onDetails: (book: Book, trigger: HTMLButtonElement) => void;
}

export function BookCard({
  book,
  inWishlist,
  onWishlistToggle,
  onDetails,
}: BookCardProps) {
  const coverUrl = book.coverId
    ? `https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`
    : null;

  return (
    <article className="book-card">
      <div className="book-card__cover">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={`Обложка книги ${book.title}`}
            loading="lazy"
          />
        ) : (
          <div className="book-card__placeholder">
            Нет обложки
          </div>
        )}
      </div>

      <div className="book-card__content">
        <h3>{book.title}</h3>

        <p>
          {book.authors.length > 0
            ? book.authors.join(", ")
            : "Автор не указан"}
        </p>

        <div className="book-card__badges">
          {book.year && (
            <Badge>{book.year}</Badge>
          )}

          <Badge>
            {inWishlist
              ? "В желаемом"
              : "Каталог"}
          </Badge>
        </div>

        <div className="book-card__actions">
         <Button type="button" onClick={(event) => onDetails(book, event.currentTarget)}>
  Подробнее
</Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              onWishlistToggle(book)
            }
          >
            {inWishlist
              ? "Удалить из желаемого"
              : "В желаемое"}
          </Button>
        </div>
      </div>
    </article>
  );
}