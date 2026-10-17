import {
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { CatalogSection } from "../../components/CatalogSection";
import { usePaginatedBooks } from "../../features/books/hooks/usePaginatedBooks";
import { getVisibleBooks } from "../../lib/catalog";
import {
  loadWishlist,
  saveWishlist,
} from "../../lib/storage";

import type {
  Book,
  SortOption,
} from "../../types";

const DEFAULT_SORT: SortOption =
  "relevance";

const SORT_OPTIONS: SortOption[] = [
  "relevance",
  "title-asc",
  "title-desc",
  "year-asc",
  "year-desc",
];

function getSortOption(
  value: string | null,
): SortOption {
  if (
    value &&
    SORT_OPTIONS.includes(
      value as SortOption,
    )
  ) {
    return value as SortOption;
  }

  return DEFAULT_SORT;
}

function getPage(
  value: string | null,
): number {
  const page =
    Number.parseInt(
      value ?? "1",
      10,
    );

  return Number.isNaN(page) ||
    page < 1
    ? 1
    : page;
}

export function BooksPage() {
  const navigate =
    useNavigate();

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const query =
    searchParams.get("q") ?? "";

  const sort =
    getSortOption(
      searchParams.get("sort"),
    );

  const onlyWithCover =
    searchParams.get("cover") ===
    "1";

  const page =
    getPage(
      searchParams.get("page"),
    );

  const [wishlist, setWishlist] =
    useState<Book[]>(() =>
      loadWishlist(),
    );

  const {
    books,
    status,
    errorMessage,
    loadingMore,
    hasMore,
    search,
    retry,
  } = usePaginatedBooks(
    query,
    page,
  );

  const wishlistIds =
    useMemo(
      () =>
        new Set(
          wishlist.map(
            (book) =>
              book.id,
          ),
        ),
      [wishlist],
    );

  const visibleBooks =
    useMemo(
      () =>
        getVisibleBooks(
          books,
          sort,
          onlyWithCover,
        ),
      [
        books,
        sort,
        onlyWithCover,
      ],
    );

  function updateParams(
    updates: Record<
      string,
      string | null
    >,
  ) {
    const next =
      new URLSearchParams(
        searchParams,
      );

    Object.entries(
      updates,
    ).forEach(
      ([key, value]) => {
        if (
          value === null ||
          value === ""
        ) {
          next.delete(key);
        } else {
          next.set(
            key,
            value,
          );
        }
      },
    );

    setSearchParams(next);
  }

  function handleQueryChange(
    value: string,
  ) {
    updateParams({
      q: value,
      page: "1",
    });
  }

  function handleSortChange(
    value: SortOption,
  ) {
    updateParams({
      sort:
        value ===
        DEFAULT_SORT
          ? null
          : value,
      page: "1",
    });
  }

  function handleCoverChange(
    value: boolean,
  ) {
    updateParams({
      cover:
        value
          ? "1"
          : null,
      page: "1",
    });
  }

  function handleWishlistToggle(
    book: Book,
  ) {
    setWishlist(
      (current) => {
        const exists =
          current.some(
            (item) =>
              item.id ===
              book.id,
          );

        const next =
          exists
            ? current.filter(
                (item) =>
                  item.id !==
                  book.id,
              )
            : [
                ...current,
                book,
              ];

        saveWishlist(next);

        return next;
      },
    );
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

  function handleLoadMore() {
    updateParams({
      page: String(
        page + 1,
      ),
    });
  }

  return (
    <section>
      <h2>
        Каталог книг
      </h2>

      <CatalogSection
        query={query}
        sort={sort}
        onlyWithCover={
          onlyWithCover
        }
        books={
          visibleBooks
        }
        wishlistIds={
          wishlistIds
        }
        status={status}
        errorMessage={
          errorMessage
        }
        loadingMore={
          loadingMore
        }
        hasMore={
          hasMore
        }
        onQueryChange={
          handleQueryChange
        }
        onSearch={
          search
        }
        onSortChange={
          handleSortChange
        }
        onCoverChange={
          handleCoverChange
        }
        onWishlistToggle={
          handleWishlistToggle
        }
        onDetails={
          handleDetails
        }
        onLoadMore={
          handleLoadMore
        }
        onRetry={retry}
      />
    </section>
  );
}