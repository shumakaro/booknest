// Работа с собственным API: токен добавляется только здесь.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
let accessToken: string | null = null;
let pendingRefresh: Promise<void> | null = null;

export class ApiError extends Error {
  status: number;
  details?: { loc?: (string | number)[]; msg?: string }[];
  requestId?: string;
  constructor(message: string, status: number, details?: ApiError["details"], requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }
}

export function setAccessToken(token: string | null) {
  // Access находится только в памяти; refresh доступен серверу через HttpOnly cookie.
  accessToken = token;
}

async function readError(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => ({}));
  return new ApiError(body.message ?? `Запрос не выполнен (${response.status})`, response.status,
    Array.isArray(body.details) ? body.details : undefined, body.request_id);
}

export async function refreshAccess(): Promise<void> {
  // Одновременные запросы делят одну ротацию refresh, иначе токен оказался бы использован дважды.
  if (!pendingRefresh) {
    pendingRefresh = (async () => {
      const response = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" });
      if (!response.ok) throw await readError(response);
      const data = await response.json() as { access_token: string };
      setAccessToken(data.access_token);
    })().finally(() => { pendingRefresh = null; });
  }
  return pendingRefresh;
}

export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const reference = error.requestId && error.status >= 500 ? ` Код обращения: ${error.requestId}.` : "";
    return error.message + reference;
  }
  return "Не удалось выполнить действие. Повторите попытку.";
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (options.body && !(options.body instanceof URLSearchParams) && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("Не удалось связаться с сервером. Проверьте соединение и повторите попытку.", 0);
  }
  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    try {
      await refreshAccess();
      return await apiFetch<T>(path, options, false);
    } catch (error) {
      setAccessToken(null);
      globalThis.dispatchEvent(new Event("booknest:logout"));
      if (!location.pathname.startsWith("/login")) {
        const returnTo = location.pathname + location.search + location.hash;
        location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      }
      throw error;
    }
  }
  if (!response.ok) throw await readError(response);
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

// На этапе ЛР №9 старый каталог ещё использует внешний API; переход завершается в ЛР №10.
export async function request<T>(path: string, params?: Record<string, string | number>, signal?: AbortSignal): Promise<T> {
  const url = new URL(path, "https://openlibrary.org");
  if (params) for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new ApiError(`Внешний каталог не ответил (${response.status})`, response.status);
    return await response.json() as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    if (error instanceof ApiError) throw error;
    throw new ApiError("Не удалось загрузить каталог. Проверьте соединение.", 0);
  }
}
