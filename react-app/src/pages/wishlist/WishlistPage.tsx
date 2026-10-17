import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { syncWishlist } from "../../api/wishlist";
import { WishlistSection } from "../../components/WishlistSection";
import {
  loadWishlist,
  saveWishlist,
} from "../../lib/storage";

import type { Book } from "../../types";

export function WishlistPage() {
  const navigate =
    useNavigate();

  const [books, setBooks] =
    useState<Book[]>(() =>
      loadWishlist(),
    );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  async function handleWishlistToggle(
    book: Book,
  ) {
    const previousBooks = books;

    const nextBooks =
      books.filter(
        (item) =>
          item.id !== book.id,
      );

    setBooks(nextBooks);
    saveWishlist(nextBooks);
    setErrorMessage("");

    try {
      await syncWishlist(book);
    } catch {
      setBooks(previousBooks);
      saveWishlist(previousBooks);

      setErrorMessage(
        "Ошибка синхронизации. Изменение отменено.",
      );
    }
  }

  function handleDetails(
    book: Book,
  ) {
    navigate(
      `/books/${encodeURIComponent(
        book.id,
      )}`,
    );
  }

  return (
    <section>
      <h2>
        Список желаемого
      </h2>

      {errorMessage && (
        <p role="alert">
          {errorMessage}
        </p>
      )}

      <WishlistSection
        books={books}
        onWishlistToggle={
          handleWishlistToggle
        }
        onDetails={
          handleDetails
        }
      />
    </section>
  );
}