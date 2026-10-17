import {
  useCallback,
  useEffect,
  useMemo,
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

interface SearchRequest {
  query: string;
  page: number;
}

interface UsePaginatedBooksResult {
  books: Book[];
  status: RequestStatus;
  errorMessage: string;
  loadingMore: boolean;
  hasMore: boolean;
  search: () => void;
  retry: () => void;
}

export function usePaginatedBooks(
  query: string,
  requestedPage: number,
): UsePaginatedBooksResult {
  const [books, setBooks] =
    useState<Book[]>([]);

  const [status, setStatus] =
    useState<RequestStatus>("idle");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [total, setTotal] =
    useState(0);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const controllerRef =
    useRef<AbortController | null>(null);

  const loadedQueryRef =
    useRef("");

  const loadedPageRef =
    useRef(0);

  const loadBooks = useCallback(
    async (
      searchQuery: string,
      targetPage: number,
    ) => {
      const normalizedQuery =
        searchQuery.trim();

      if (
        normalizedQuery.length <
        MIN_QUERY_LENGTH
      ) {
        controllerRef.current?.abort();

        loadedQueryRef.current = "";
        loadedPageRef.current = 0;

        setBooks([]);
        setTotal(0);
        setErrorMessage("");
        setStatus("idle");
        setLoadingMore(false);

        return;
      }

      controllerRef.current?.abort();

      const controller =
        new AbortController();

      controllerRef.current =
        controller;

      const sameQuery =
        loadedQueryRef.current ===
        normalizedQuery;

      const canAppend =
        sameQuery &&
        targetPage >
          loadedPageRef.current;

      const startPage =
        canAppend
          ? loadedPageRef.current + 1
          : 1;

      if (canAppend) {
        setLoadingMore(true);
      } else {
        setStatus("loading");
        setErrorMessage("");
      }

      try {
        const newBooks: Book[] = [];
        let nextTotal = 0;

        for (
          let page = startPage;
          page <= targetPage;
          page += 1
        ) {
          const result =
            await searchBooks(
              normalizedQuery,
              page,
              controller.signal,
            );

          newBooks.push(
            ...result.docs,
          );

          nextTotal =
            result.total;
        }

        setBooks((current) =>
          canAppend
            ? [
                ...current,
                ...newBooks,
              ]
            : newBooks,
        );

        setTotal(nextTotal);

        loadedQueryRef.current =
          normalizedQuery;

        loadedPageRef.current =
          targetPage;

        setStatus(
          newBooks.length === 0 &&
            !canAppend
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

  const request = useMemo<SearchRequest>(
    () => ({
      query,
      page: requestedPage,
    }),
    [query, requestedPage],
  );

  const runRequest = useCallback(
    (value: SearchRequest) => {
      void loadBooks(
        value.query,
        value.page,
      );
    },
    [loadBooks],
  );

  useDebounce(
    request,
    runRequest,
    DEBOUNCE_DELAY,
  );

  const search = useCallback(() => {
    void loadBooks(
      query,
      requestedPage,
    );
  }, [
    loadBooks,
    query,
    requestedPage,
  ]);

  const retry = search;

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
    hasMore:
      books.length < total,
    search,
    retry,
  };
}