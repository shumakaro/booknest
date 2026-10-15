import type {
  Book,
  RequestStatus,
  SortOption,
} from "../types";

import { BookList } from "./BookList";
import { EmptyState } from "./EmptyState";
import { ErrorBox } from "./ErrorBox";
import { FiltersPanel } from "./FiltersPanel";
import { LoadMoreButton } from "./LoadMoreButton";
import { SearchPanel } from "./SearchPanel";

interface CatalogSectionProps {
  query: string;
  sort: SortOption;
  onlyWithCover: boolean;
  books: Book[];
  wishlistIds: Set<string>;
  status: RequestStatus;
  errorMessage: string;
  loadingMore: boolean;
  hasMore: boolean;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onSortChange: (value: SortOption) => void;
  onCoverChange: (value: boolean) => void;
  onWishlistToggle: (book: Book) => void;
  onDetails: (book: Book, trigger: HTMLButtonElement) => void;
  onLoadMore: () => void;
  onRetry: () => void;
}

// Визуальная часть каталога без собственного состояния.
export function CatalogSection({
  query,
  sort,
  onlyWithCover,
  books,
  wishlistIds,
  status,
  errorMessage,
  loadingMore,
  hasMore,
  onQueryChange,
  onSearch,
  onSortChange,
  onCoverChange,
  onWishlistToggle,
  onDetails,
  onLoadMore,
  onRetry,
}: CatalogSectionProps) {
  return (
    <>
      <SearchPanel
        query={query}
        loading={status === "loading"}
        onQueryChange={onQueryChange}
        onSubmit={onSearch}
      />

      <FiltersPanel
        sort={sort}
        onlyWithCover={onlyWithCover}
        onSortChange={onSortChange}
        onCoverChange={onCoverChange}
      />

      {status === "idle" && (
        <EmptyState
          title="Найдите книгу"
          message="Введите минимум два символа в строку поиска."
        />
      )}

      {status === "error" && (
        <ErrorBox
          message={errorMessage}
          onRetry={onRetry}
        />
      )}

      {status === "empty" && (
        <EmptyState
          title="Ничего не найдено"
          message="Попробуйте изменить поисковый запрос."
        />
      )}

      {status === "success" && (
        <>
          <BookList
            books={books}
            wishlistIds={wishlistIds}
            onWishlistToggle={onWishlistToggle}
            onDetails={onDetails}
          />

          <LoadMoreButton
            visible={hasMore}
            loading={loadingMore}
            onClick={onLoadMore}
          />
        </>
      )}
    </>
  );
}