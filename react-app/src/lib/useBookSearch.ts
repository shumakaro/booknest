import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { searchBooks } from "../api/books";

import type {
  Book,
  RequestStatus,
} from "../types";

// Минимальная длина запроса.
// Короткие запросы не отправляем в Open Library.
const MIN_QUERY_LENGTH = 2;

// Задержка автоматического поиска после ввода.
const DEBOUNCE_DELAY = 350;

interface UseBookSearchResult {
  books: Book[];
  status: RequestStatus;
  errorMessage: string;
  loadingMore: boolean;
  hasMore: boolean;
  search: (query: string) => void;
  loadMore: () => void;
  retry: () => void;
}

// Hook хранит только состояние,
// связанное с поиском книг.
export function useBookSearch(): UseBookSearchResult {
  const [books, setBooks] =
    useState<Book[]>([]);

  const [status, setStatus] =
    useState<RequestStatus>("idle");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);

  const [loadingMore, setLoadingMore] =
    useState(false);

  // Запоминаем последний запрос,
  // чтобы Retry мог повторить его.
  const lastQueryRef = useRef("");

  // Через AbortController отменяем старый запрос,
  // если пользователь быстро вводит новый текст.
  const controllerRef =
    useRef<AbortController | null>(null);

  const executeSearch = useCallback(
    async (
      query: string,
      nextPage: number,
      append: boolean,
    ) => {
      const normalizedQuery = query.trim();

      if (
        normalizedQuery.length <
        MIN_QUERY_LENGTH
      ) {
        controllerRef.current?.abort();

        setBooks([]);
        setTotal(0);
        setPage(1);
        setErrorMessage("");
        setStatus("idle");

        return;
      }

      // Старый запрос больше не нужен.
      controllerRef.current?.abort();

      const controller =
        new AbortController();

      controllerRef.current = controller;

      lastQueryRef.current =
        normalizedQuery;

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

        // При "Показать ещё" добавляем новые книги,
        // а не заменяем уже загруженные.
        setBooks((current) =>
          append
            ? [...current, ...result.docs]
            : result.docs,
        );

        setTotal(result.total);
        setPage(nextPage);

        setStatus(
          result.docs.length === 0 &&
            !append
            ? "empty"
            : "success",
        );
      } catch (error) {
        // Отменённый запрос не показываем пользователю
        // как настоящую ошибку.
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setStatus("error");

        if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage(
            "Не удалось загрузить книги.",
          );
        }
      } finally {
        setLoadingMore(false);
      }
    },
    [],
  );

  // Обычный поиск всегда начинается с первой страницы.
  const search = useCallback(
    (query: string) => {
      void executeSearch(
        query,
        1,
        false,
      );
    },
    [executeSearch],
  );

  // Загружаем следующую страницу
  // для кнопки "Показать ещё".
  const loadMore = useCallback(() => {
    if (
      loadingMore ||
      !lastQueryRef.current
    ) {
      return;
    }

    void executeSearch(
      lastQueryRef.current,
      page + 1,
      true,
    );
  }, [
    executeSearch,
    loadingMore,
    page,
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

  // При удалении компонента отменяем
  // незавершённый сетевой запрос.
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

    // Open Library возвращает общее количество результатов.
    // Поэтому можем определить,
    // есть ли ещё книги для загрузки.
    hasMore: books.length < total,

    search,
    loadMore,
    retry,
  };
}

// Отдельный hook для debounce.
// Он запускает поиск только после паузы во вводе.
export function useDebouncedSearch(
  query: string,
  onSearch: (query: string) => void,
): void {
  useEffect(() => {
    const normalizedQuery = query.trim();

    if (
      normalizedQuery.length <
      MIN_QUERY_LENGTH
    ) {
      return;
    }

    const timer = globalThis.setTimeout(
      () => {
        onSearch(normalizedQuery);
      },
      DEBOUNCE_DELAY,
    );

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [query, onSearch]);
}