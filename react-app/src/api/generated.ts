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

export interface Body_token_api_v1_auth_token_post {
  grant_type?: string | null;
  username: string;
  password: string;
  scope?: string;
  client_id?: string | null;
  client_secret?: string | null;
}

export interface BookCreate {
  title: string;
  author_id: number;
  year: number;
  isbn?: string | null;
  genre?: "scifi" | "history" | "poetry" | "cs" | "fiction";
  total_copies?: number;
  description?: string;
  publisher?: string;
  language?: string;
  edition_year?: number | null;
  pages?: number;
}

export interface BookRead {
  title: string;
  author_id: number;
  year: number;
  isbn?: string | null;
  genre?: "scifi" | "history" | "poetry" | "cs" | "fiction";
  total_copies?: number;
  description?: string;
  publisher?: string;
  language?: string;
  edition_year?: number | null;
  pages?: number;
  id: number;
  available: number;
  author: string;
  external_work_id?: string | null;
  cover_id?: number | null;
}

export interface BookUpdate {
  title?: string | null;
  author_id?: number | null;
  year?: number | null;
  isbn?: string | null;
  genre?: "scifi" | "history" | "poetry" | "cs" | "fiction" | null;
  total_copies?: number | null;
  description?: string | null;
  publisher?: string | null;
  language?: string | null;
  edition_year?: number | null;
  pages?: number | null;
}

export interface ConfirmationRequest {
  token: string;
}

export interface ErrorRead {
  code: string;
  message: string;
  details?: unknown | null;
  request_id: string;
}

export interface ExternalBook {
  id: string;
  title: string;
  authors?: (string)[];
  year?: number | null;
  cover_id?: number | null;
}

export interface ExternalDetails {
  id: string;
  title: string;
  authors?: (string)[];
  year?: number | null;
  cover_id?: number | null;
  description: string;
  notice?: string | null;
}

export interface ExternalPage {
  items: (ExternalBook)[];
  total: number;
  page: number;
  size: number;
  has_more: boolean;
}

export interface HealthRead {
  status: string;
}

export interface ImportBook {
  work_id: string;
  year: number;
  total_copies?: number;
  genre?: "scifi" | "history" | "poetry" | "cs" | "fiction";
}

export interface LoanCreate {
  user_id?: number | null;
  due_date: string;
}

export interface LoanRead {
  id: number;
  book_id: number;
  user_id: number;
  issued_at: string;
  due_date: string;
  returned_at: string | null;
  book_title?: string | null;
}

export interface LoanReturn {
  state: string;
}

export interface MessageRead {
  message: string;
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

export interface Page_LoanRead_ {
  items: (LoanRead)[];
  total: number;
  page: number;
  size: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface TokenRead {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserRead {
  id: number;
  email: string;
  role: "member" | "librarian";
  is_active: boolean;
  email_verified: boolean;
}
