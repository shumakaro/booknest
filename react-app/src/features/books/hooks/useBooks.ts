import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { searchBooks } from "../../../api/books";
import { useDebounce } from "../../../shared/hooks/useDebounce";

import type {
  Book,
  RequestStatus,
} from "../../../types";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_DELAY = 350;

interface UseBooksResult {
  books: Book[];
  status: RequestStatus;
  errorMessage: string;
  loadingMore: boolean;
  hasMore: boolean;
  search: (query: string) => void;
  loadMore: () => void;
  retry: () => void;
}

export function useBooks(query: string): UseBooksResult {
  const [books, setBooks] = useState<Book[]>([]);
  const [status, setStatus] =
    useState<RequestStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const lastQueryRef = useRef("");
  const controllerRef =
    useRef<AbortController | null>(null);


  const executeSearch = useCallback(
    async (
      searchQuery: string,
      nextPage: number,
      append: boolean,
    ) => {
      const normalizedQuery = searchQuery.trim();

      if (normalizedQuery.length < MIN_QUERY_LENGTH) {
        controllerRef.current?.abort();

        setBooks([]);
        setTotal(0);
        setPage(1);
        setErrorMessage("");
        setStatus("idle");

        return;
      }

      controllerRef.current?.abort();

      const controller = new AbortController();
      controllerRef.current = controller;
      lastQueryRef.current = normalizedQuery;

      if (append) {
        setLoadingMore(true);
      } else {
        setStatus("loading");
        setErrorMessage("");
      }

      try {
        const result = await searchBooks(
          normalizedQuery,
          nextPage,
          controller.signal,
        );

        setBooks((current) =>
          append
            ? [...current, ...result.docs]
            : result.docs,
        );

        setTotal(result.total);
        setPage(nextPage);

        setStatus(
          result.docs.length === 0 && !append
            ? "empty"
            : "success",
        );
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setStatus("error");

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить книги.",
        );
      } finally {
        setLoadingMore(false);
      }
    },
    [],
  );

  const search = useCallback(
    (searchQuery: string) => {
      void executeSearch(searchQuery, 1, false);
    },
    [executeSearch],
  );

  const loadMore = useCallback(() => {
    if (
      loadingMore ||
      !lastQueryRef.current ||
      books.length >= total
    ) {
      return;
    }

    void executeSearch(
      lastQueryRef.current,
      page + 1,
      true,
    );
  }, [
    books.length,
    executeSearch,
    loadingMore,
    page,
    total,
  ]);

  const retry = useCallback(() => {
    if (!lastQueryRef.current) {
      return;
    }

    void executeSearch(
      lastQueryRef.current,
      1,
      false,
    );
  }, [executeSearch]);

useDebounce(
  query,
  search,
  DEBOUNCE_DELAY,
);

useEffect(() => {
  return () => {
    controllerRef.current?.abort();
  };
}, []);

  return {
    books,
    status,
    errorMessage,
    loadingMore,
    hasMore: books.length < total,
    search,
    loadMore,
    retry,
  };
}