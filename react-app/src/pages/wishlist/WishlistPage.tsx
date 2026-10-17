import { useState } from "react";
import { useNavigate } from "react-router-dom";

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

  function handleWishlistToggle(
    book: Book,
  ) {
    setBooks((current) => {
      const next =
        current.filter(
          (item) =>
            item.id !== book.id,
        );

      saveWishlist(next);

      return next;
    });
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
      <h2>Список желаемого</h2>

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