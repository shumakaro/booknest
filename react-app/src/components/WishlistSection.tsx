import type { Book } from "../types";

import { WishlistPanel } from "./WishlistPanel";
import { WishlistTable } from "./WishlistTable";

interface WishlistSectionProps {
  books: Book[];
  onWishlistToggle: (book: Book) => void;
  onDetails: (book: Book, trigger: HTMLButtonElement) => void;
}

// Wishlist показываем и карточками, и через DataTable<T>.
export function WishlistSection({
  books,
  onWishlistToggle,
  onDetails,
}: WishlistSectionProps) {
  return (
    <>
      <WishlistPanel
        books={books}
        onRemove={onWishlistToggle}
        onDetails={onDetails}
      />

      <WishlistTable books={books} />
    </>
  );
}