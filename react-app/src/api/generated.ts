// Файл создан tools/generate_api_types.py из OpenAPI. Правки вносятся в схемы Python.
export interface AuthorCreate {
  name: string;
  birth_year?: number | null;
}

export interface AuthorRead {
  name: string;
  birth_year?: number | null;
  id: number;
}

export interface AuthorUpdate {
  name?: string | null;
  birth_year?: number | null;
}

export interface BookCreate {
  title: string;
  author_id: number;
  year: number;
  isbn?: string | null;
  genre?: "scifi" | "history" | "poetry" | "cs" | "fiction";
  total_copies?: number;
  description?: string;
}

export interface BookRead {
  title: string;
  author_id: number;
  year: number;
  isbn?: string | null;
  genre?: "scifi" | "history" | "poetry" | "cs" | "fiction";
  total_copies?: number;
  description?: string;
  id: number;
  available: number;
  author: string;
}

export interface BookUpdate {
  title?: string | null;
  author_id?: number | null;
  year?: number | null;
  isbn?: string | null;
  genre?: "scifi" | "history" | "poetry" | "cs" | "fiction" | null;
  total_copies?: number | null;
  description?: string | null;
}

export interface HealthRead {
  status: string;
}

export interface Page_AuthorRead_ {
  items: (AuthorRead)[];
  total: number;
  page: number;
  size: number;
}

export interface Page_BookRead_ {
  items: (BookRead)[];
  total: number;
  page: number;
  size: number;
}
