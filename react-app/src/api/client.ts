// Работа с собственным API: токен добавляется только здесь.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
let accessToken: string | null = null;
let sessionVersion = 0;
let pendingRefresh: { version: number; promise: Promise<void> } | null = null;

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
  sessionVersion += 1;
}

async function readError(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => ({}));
  return new ApiError(body.message ?? `Запрос не выполнен (${response.status})`, response.status,
    Array.isArray(body.details) ? body.details : undefined, body.request_id);
}

export async function refreshAccess(): Promise<void> {
  // Одновременные запросы делят одну ротацию refresh, иначе токен оказался бы использован дважды.
  const version = sessionVersion;
  if (!pendingRefresh || pendingRefresh.version !== version) {
    const promise = (async () => {
      let response: Response;
      try { response = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" }); }
      catch { throw new ApiError("Не удалось обновить сеанс. Проверьте соединение и повторите попытку.", 0); }
      if (!response.ok) throw await readError(response);
      const data = await response.json() as { access_token: string };
      // Вход/выход сменяет поколение сеанса: старый ответ не возвращает прежнюю личность.
      if (version !== sessionVersion) throw new ApiError("Сеанс изменился. Повторите действие.", 401);
      accessToken = data.access_token;
    })().finally(() => { if (pendingRefresh?.promise === promise) pendingRefresh = null; });
    pendingRefresh = { version, promise };
  }
  return pendingRefresh.promise;
}

export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const reference = error.requestId && error.status >= 500 ? ` Код обращения: ${error.requestId}.` : "";
    return error.message + reference;
  }
  return "Не удалось выполнить действие. Повторите попытку.";
}

function endSession() {
  setAccessToken(null);
  globalThis.dispatchEvent(new Event("booknest:logout"));
  if (!location.pathname.startsWith("/login")) {
    const returnTo = location.pathname + location.search + location.hash;
    location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}&reason=session-expired`);
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const version = sessionVersion;
  const sentToken = accessToken;
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
  // Старый личный ответ не должен заполнить экран уже другого пользователя.
  if (sentToken && version !== sessionVersion && !path.startsWith("/auth/")) throw new ApiError("Сеанс изменился. Повторите действие.", 401);
  if (response.status === 401 && !path.startsWith("/auth/")) {
    if (version !== sessionVersion) throw new ApiError("Сеанс изменился. Повторите действие.", 401);
    if (retry) {
      // Другой запрос уже мог обновить access, пока этот ожидал свой первый 401.
      try { if (!accessToken || accessToken === sentToken) await refreshAccess(); }
      catch (error) {
        if (version === sessionVersion && error instanceof ApiError && error.status === 401) endSession();
        throw error;
      }
      if (version !== sessionVersion) throw new ApiError("Сеанс изменился. Повторите действие.", 401);
      if (options.signal?.aborted) throw new DOMException("Запрос отменен", "AbortError");
      // Ошибку повторного запроса не смешиваем с ошибкой refresh.
      return apiFetch<T>(path, options, false);
    }
    endSession();
  }
  if (!response.ok) throw await readError(response);
  if (response.status === 204) return undefined as T;
  const data = await response.json() as T;
  if (sentToken && version !== sessionVersion && !path.startsWith("/auth/")) throw new ApiError("Сеанс изменился. Повторите действие.", 401);
  return data;
}

// Совместимая обёртка старых хуков теперь обращается только к собственному API.
export async function request<T>(path: string, params?: Record<string, string | number>, signal?: AbortSignal): Promise<T> {
  const query = new URLSearchParams();
  if (params) for (const [key, value] of Object.entries(params)) query.set(key, String(value));
  return apiFetch<T>(path + (query.size ? `?${query}` : ""), { signal });
}
