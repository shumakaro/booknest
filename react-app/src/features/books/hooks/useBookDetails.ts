import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { getBookDetailsById } from "../../../api/books";
import { ApiError } from "../../../api/client";

import type {
  BookDetails,
  RequestStatus,
} from "../../../types";

interface UseBookDetailsResult {
  details: BookDetails | null;
  status: RequestStatus;
  errorMessage: string;
  notFound: boolean;
  retry: () => void;
}

export function useBookDetails(
  bookId: string | undefined,
): UseBookDetailsResult {
  const [details, setDetails] =
    useState<BookDetails | null>(null);

  const [status, setStatus] =
    useState<RequestStatus>("loading");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [notFound, setNotFound] =
    useState(false);

  const controllerRef =
    useRef<AbortController | null>(null);

  const loadDetails = useCallback(
    async (id: string) => {
      controllerRef.current?.abort();

      const controller =
        new AbortController();

      controllerRef.current =
        controller;

      setDetails(null);
      setErrorMessage("");
      setNotFound(false);
      setStatus("loading");

      try {
        const result =
          await getBookDetailsById(
            id,
            controller.signal,
          );

        setDetails(result);
        setStatus("success");
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setDetails(null);

        if (
          error instanceof ApiError &&
          error.status === 404
        ) {
          setNotFound(true);
          setErrorMessage(
            "Книга с таким идентификатором не найдена.",
          );
        } else {
          setNotFound(false);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Не удалось загрузить информацию о книге.",
          );
        }

        setStatus("error");
      }
    },
    [],
  );

  const retry = useCallback(() => {
    if (bookId) {
      void loadDetails(bookId);
    }
  }, [bookId, loadDetails]);

  useEffect(() => {
    if (!bookId) {
      return;
    }

    const timerId =
      globalThis.setTimeout(() => {
        void loadDetails(bookId);
      }, 0);

    return () => {
      globalThis.clearTimeout(timerId);
      controllerRef.current?.abort();
    };
  }, [bookId, loadDetails]);

  return {
    details,
    status,
    errorMessage,
    notFound,
    retry,
  };
}