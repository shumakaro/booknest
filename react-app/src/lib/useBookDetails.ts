import {
  useCallback,
  useRef,
  useState,
} from "react";

import { getBookDetails } from "../api/books";

import type {
  Book,
  BookDetails,
  RequestStatus,
} from "../types";

interface UseBookDetailsResult {
  details: BookDetails | null;
  status: RequestStatus;
  errorMessage: string;
  openDetails: (book: Book) => void;
  closeDetails: () => void;
  retry: () => void;
}

// Отдельный hook отвечает только за окно
// с подробной информацией о книге.
export function useBookDetails(): UseBookDetailsResult {
  const [details, setDetails] =
    useState<BookDetails | null>(null);

  const [status, setStatus] =
    useState<RequestStatus>("idle");

  const [errorMessage, setErrorMessage] =
    useState("");

  // Запоминаем выбранную книгу,
  // чтобы кнопка Retry могла повторить запрос.
  const selectedBookRef =
    useRef<Book | null>(null);

  // Храним контроллер для отмены незавершённого запроса.
  const controllerRef =
    useRef<AbortController | null>(null);

  const openDetails = useCallback(
    async (book: Book) => {
      controllerRef.current?.abort();

      const controller =
        new AbortController();

      controllerRef.current = controller;
      selectedBookRef.current = book;

      setDetails(null);
      setErrorMessage("");
      setStatus("loading");

      try {
        const result =
          await getBookDetails(
            book,
            controller.signal,
          );

        setDetails(result);
        setStatus("success");
      } catch (error) {
        // Отмена запроса не является ошибкой для пользователя.
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
            : "Не удалось получить информацию о книге.",
        );
      }
    },
    [],
  );

  const closeDetails = useCallback(() => {
    controllerRef.current?.abort();

    setDetails(null);
    setStatus("idle");
    setErrorMessage("");
  }, []);

  const retry = useCallback(() => {
    if (selectedBookRef.current) {
      void openDetails(
        selectedBookRef.current,
      );
    }
  }, [openDetails]);

  return {
    details,
    status,
    errorMessage,
    openDetails,
    closeDetails,
    retry,
  };
}