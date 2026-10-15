// Основная модель книги в приложении.
export interface Book {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  coverId?: number;
}

// Результат поиска Open Library.
export interface SearchResult {
  docs: Book[];
  total: number;
}

// Состояния загрузки данных.
export type RequestStatus =
  | "idle"
  | "loading"
  | "success"
  | "empty"
  | "error";

// Варианты сортировки каталога.
export type SortOption =
  | "relevance"
  | "title-asc"
  | "title-desc"
  | "year-asc"
  | "year-desc";

// Варианты темы интерфейса.
export type Theme = "light" | "dark";

// Данные ошибки API.
export interface ApiErrorData {
  message: string;
  status: number;
}

// Данные автора Open Library.
export interface Author {
  id: string;
  name: string;
}

// Данные детальной страницы книги.
export interface BookDetails {
  id: string;
  title: string;
  description: string;
  authors: Author[];
}