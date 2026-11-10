// Карточка показывает реальные данные API; декоративный переплет не выдается за издательскую обложку.
import { useState } from "react";
import type { Book } from "../types";
import { Badge } from "./Badge";
import { Button } from "./Button";

interface BookCardProps {
  book: Book;
  wishlistPending?: boolean;
  inWishlist: boolean;
  onWishlistToggle: (book: Book) => void;
  onDetails: (book: Book, trigger: HTMLButtonElement) => void;
}

export function BookCard({
  book,
  wishlistPending = false,
  inWishlist,
  onWishlistToggle,
  onDetails,
}: BookCardProps) {
  // Сбой внешней картинки переключает на декоративный переплет, а не ломает карточку.
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const coverUrl = book.coverId
    ? `https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`
    : null;

  return (
    <article className="book-card">
      <div className="book-card__cover">
        {coverUrl && failedCover !== coverUrl ? (
          <img
            src={coverUrl}
            alt={`Обложка книги ${book.title}`}
            loading="lazy"
            onError={() => setFailedCover(coverUrl)}
          />
        ) : (
          <div className={`book-card__placeholder book-jacket book-jacket--${Number(book.id) % 3 || 0}`} aria-label="Декоративный переплет; оригинальная обложка отсутствует"><span className="book-jacket__mark" aria-hidden="true">BN</span><strong>{book.title}</strong><span>{book.authors.join(", ")}</span><small>BOOKNEST · БИБЛИОТЕКА</small></div>
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

          {book.record && <Badge>{book.record.available > 0 ? `Доступно: ${book.record.available}` : "Все экземпляры выданы"}</Badge>}
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
            aria-pressed={inWishlist}
            disabled={wishlistPending}
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