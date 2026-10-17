import type {
  Book,
  BookDetails,
  SearchResult,
} from "../types";

import { request } from "./client";

// Тип одного объекта книги,
// который приходит из Open Library.
interface OpenLibraryDocument {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
}

// Тип полного ответа поискового запроса.
interface OpenLibrarySearchResponse {
  docs?: OpenLibraryDocument[];
  numFound?: number;
}

// На одной странице загружаем по 20 книг.
const LIMIT = 20;

// Поиск книг через Open Library.
export async function searchBooks(
  query: string,
  page: number,
  signal?: AbortSignal,
): Promise<SearchResult> {
  // Выполняем запрос через общий API-клиент.
  const data =
    await request<OpenLibrarySearchResponse>(
      "/search.json",
      {
        q: query,
        page,
        limit: LIMIT,
      },
      signal,
    );

  // Преобразуем структуру Open Library
  // в нашу внутреннюю структуру Book.
  const books: Book[] = (data.docs ?? []).map(
    (item) => ({
      // key обычно приходит в виде /works/OL...
      id: item.key ?? crypto.randomUUID(),

      title: item.title ?? "Без названия",

      authors: item.author_name ?? [],

      year: item.first_publish_year,

      coverId: item.cover_i,
    }),
  );

  // Возвращаем только те данные,
  // которые нужны нашему приложению.
  return {
    docs: books,
    total: data.numFound ?? books.length,
  };
}


// Структура ответа страницы произведения Open Library.
interface OpenLibraryWorkResponse {
  key?: string;
  title?: string;

  // В Open Library описание может быть обычной строкой
  // или объектом с полем value.
  description?:
    | string
    | {
        value?: string;
      };
}

// Загружаем подробную информацию отдельно от поиска.
// Это отдельный запрос к конкретному произведению.
export async function getBookDetails(
  book: Book,
  signal?: AbortSignal,
): Promise<BookDetails> {
  const data =
    await request<OpenLibraryWorkResponse>(
      `${book.id}.json`,
      undefined,
      signal,
    );

  let description =
    "Описание отсутствует.";

  if (typeof data.description === "string") {
    description = data.description;
  } else if (data.description?.value) {
    description = data.description.value;
  }

  return {
    id: data.key ?? book.id,
    title: data.title ?? book.title,
    description,
    authors: book.authors.map(
      (name, index) => ({
        id: `${book.id}-author-${index}`,
        name,
      }),
    ),
  };
}


interface OpenLibraryAuthorReference {
  author?: {
    key?: string;
  };
}

interface OpenLibraryAuthorResponse {
  key?: string;
  name?: string;
}

interface OpenLibraryWorkDetailsResponse {
  key?: string;
  title?: string;

  description?:
    | string
    | {
        value?: string;
      };

  authors?: OpenLibraryAuthorReference[];
}

export async function getBookDetailsById(
  bookId: string,
  signal?: AbortSignal,
): Promise<BookDetails> {
  const normalizedId =
    bookId.startsWith("/")
      ? bookId
      : `/${bookId}`;

  const data =
    await request<OpenLibraryWorkDetailsResponse>(
      `${normalizedId}.json`,
      undefined,
      signal,
    );

  let description =
    "Описание отсутствует.";

  if (
    typeof data.description === "string"
  ) {
    description = data.description;
  } else if (
    data.description?.value
  ) {
    description =
      data.description.value;
  }

  const authorKeys =
    (data.authors ?? [])
      .map(
        (item) =>
          item.author?.key,
      )
      .filter(
        (key): key is string =>
          Boolean(key),
      );

  const authors =
    await Promise.all(
      authorKeys.map(
        async (authorKey) => {
          const author =
            await request<OpenLibraryAuthorResponse>(
              `${authorKey}.json`,
              undefined,
              signal,
            );

          return {
            id:
              author.key ??
              authorKey,
            name:
              author.name ??
              "Автор не указан",
          };
        },
      ),
    );

  return {
    id:
      data.key ??
      normalizedId,

    title:
      data.title ??
      "Без названия",

    description,
    authors,
  };
}