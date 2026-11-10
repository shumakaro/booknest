// Карточка показывает реальные данные API; декоративный переплет не выдается за издательскую обложку.
import { useId, useState } from "react";
import type { Book } from "../types";
import { Badge } from "./Badge";
import { Button } from "./Button";
import "./BookCard.css";

interface BookCardProps {
  book: Book;
  wishlistPending?: boolean;
  inWishlist: boolean;
  onWishlistToggle?: (book: Book) => void;
  sourceLabel?: string;
  onDetails: (book: Book, trigger: HTMLButtonElement) => void;
}

export function BookCard({
  book,
  wishlistPending = false,
  inWishlist,
  onWishlistToggle,
  sourceLabel = "Каталог",
  onDetails,
}: BookCardProps) {
  // У каждой карточки свое имя для экранного диктора, даже при повторяющихся названиях.
  const titleId = useId();
  // Сбой внешней картинки переключает на декоративный переплет, а не ломает карточку.
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const coverUrl = book.coverId
    ? `https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`
    : null;

  return (
    <article className="book-card" aria-labelledby={titleId}>
      <div className="book-card__cover">
        {coverUrl && failedCover !== coverUrl ? (
          <img
            src={coverUrl}
            alt={`Обложка книги ${book.title}`}
            loading="lazy"
            decoding="async"
            onError={() => setFailedCover(coverUrl)}
          />
        ) : (
          <div
            className={`book-card__placeholder book-jacket book-jacket--${Number(book.id) % 3 || 0}`}
            role="img"
            aria-label={`Декоративный переплет книги «${book.title}»: оригинальная обложка отсутствует`}
          >
            <span className="book-jacket__mark" aria-hidden="true">BN</span>
            <strong>{book.title}</strong>
            <span>{book.authors.join(", ") || "Автор не указан"}</span>
            <small>BOOKNEST · БИБЛИОТЕКА</small>
          </div>
        )}
      </div>

      <div className="book-card__content">
        <h3 id={titleId}>{book.title}</h3>

        <p>
          {book.authors.length > 0
            ? book.authors.join(", ")
            : "Автор не указан"}
        </p>

        <div className="book-card__badges">
          {book.year && (
            <Badge>{book.year}</Badge>
          )}

          {/* Доступность известна только для локальной книги: внешний поиск ее не обещает. */}
          {book.record && (
            <span className={`book-card__availability ${book.record.available > 0 ? "book-card__availability--ready" : "book-card__availability--lent"}`}>
              <span className="book-card__availability-dot" aria-hidden="true" />
              {book.record.available > 0
                ? `Доступно: ${book.record.available}`
                : "Все экземпляры выданы"}
            </span>
          )}
          <Badge>
            {inWishlist
              ? "В желаемом"
              : sourceLabel}
          </Badge>
        </div>

        <div className="book-card__actions">
          <Button type="button" onClick={(event) => onDetails(book, event.currentTarget)}>
            Подробнее <span aria-hidden="true">↗</span>
          </Button>

          {onWishlistToggle && <Button
            type="button"
            variant="ghost"
            aria-pressed={inWishlist}
            disabled={wishlistPending}
            onClick={() =>
              onWishlistToggle(book)
            }
          >
            {/* Значок декоративный: название действия и aria-pressed остаются понятными. */}
            <svg className="book-card__bookmark" viewBox="0 0 24 24" fill={inWishlist ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" aria-hidden="true" focusable="false">
              <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4Z" />
            </svg>
            {inWishlist
              ? "Удалить из желаемого"
              : "В желаемое"}
          </Button>}
        </div>
      </div>
    </article>
  );
}
