import { useMemo, useState } from "react";

import "./App.css";

import type { Book, SortOption } from "./types";

import { BookDetailsModal } from "./components/BookDetailsModal";
import { CatalogSection } from "./components/CatalogSection";
import { Header } from "./components/Header";
import { WishlistSection } from "./components/WishlistSection";

import { useTheme } from "./app/useTheme";
import { useBooks } from "./features/books/hooks/useBooks";
import { useBookDetails } from "./features/books/hooks/useBookDetails";

import { getVisibleBooks } from "./lib/catalog";
import {
  loadWishlist,
  saveWishlist,
} from "./lib/storage";

function App() {
  const [query, setQuery] = useState("");
  const [sort, setSort] =
    useState<SortOption>("relevance");
  const [onlyWithCover, setOnlyWithCover] =
    useState(false);

  const [wishlist, setWishlist] =
    useState<Book[]>(() => loadWishlist());

  const [detailsTrigger, setDetailsTrigger] =
    useState<HTMLButtonElement | null>(null);

  const { theme, toggleTheme } = useTheme();

  const {
    books,
    status,
    errorMessage,
    loadingMore,
    hasMore,
    search,
    loadMore,
    retry,
  } = useBooks(query);

  const {
    details,
    status: detailsStatus,
    errorMessage: detailsError,
    openDetails,
    closeDetails,
    retry: retryDetails,
  } = useBookDetails();

  const wishlistIds = useMemo(
    () =>
      new Set(
        wishlist.map((book) => book.id),
      ),
    [wishlist],
  );

  const visibleBooks = useMemo(
    () =>
      getVisibleBooks(
        books,
        sort,
        onlyWithCover,
      ),
    [books, sort, onlyWithCover],
  );

  function handleWishlistToggle(
    book: Book,
  ) {
    setWishlist((current) => {
      const exists = current.some(
        (item) => item.id === book.id,
      );

      const next = exists
        ? current.filter(
            (item) => item.id !== book.id,
          )
        : [...current, book];

      saveWishlist(next);

      return next;
    });
  }

  function handleDetails(
    book: Book,
    trigger: HTMLButtonElement,
  ) {
    setDetailsTrigger(trigger);
    void openDetails(book);
  }

  return (
    <div
      className="app"
      data-theme={theme}
    >
      <Header
        wishlistCount={wishlist.length}
        theme={theme}
        onThemeToggle={toggleTheme}
      />

      <main className="page">
        <CatalogSection
          query={query}
          sort={sort}
          onlyWithCover={onlyWithCover}
          books={visibleBooks}
          wishlistIds={wishlistIds}
          status={status}
          errorMessage={errorMessage}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onQueryChange={setQuery}
          onSearch={() => search(query)}
          onSortChange={setSort}
          onCoverChange={setOnlyWithCover}
          onWishlistToggle={
            handleWishlistToggle
          }
          onDetails={handleDetails}
          onLoadMore={loadMore}
          onRetry={retry}
        />

        <WishlistSection
          books={wishlist}
          onWishlistToggle={
            handleWishlistToggle
          }
          onDetails={handleDetails}
        />
      </main>

      <BookDetailsModal
        open={detailsStatus !== "idle"}
        details={details}
        status={detailsStatus}
        errorMessage={detailsError}
        onClose={closeDetails}
        onRetry={retryDetails}
        returnFocusElement={
          detailsTrigger
        }
      />
    </div>
  );
}

export default App;