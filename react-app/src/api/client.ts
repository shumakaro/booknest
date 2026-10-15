// Базовый адрес Open Library.
// Если API поменяется, адрес достаточно изменить только здесь.
const BASE_URL = "https://openlibrary.org";

// Своя ошибка API.
// Храним не только текст ошибки, но и HTTP-статус.
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);

    this.name = "ApiError";
    this.status = status;
  }
}

// Универсальная функция для запросов к API.
// T означает тип данных, который ожидаем получить в ответе.
export async function request<T>(
  path: string,
  params?: Record<string, string | number>,
  signal?: AbortSignal,
): Promise<T> {
  const url = new URL(path, BASE_URL);

  // Если запросу передали параметры,
  // добавляем их в адрес через URLSearchParams.
  if (params) {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      searchParams.set(key, String(value));
    });

    url.search = searchParams.toString();
  }

  try {
    // signal нужен, чтобы можно было отменять старые запросы.
    const response = await fetch(url, { signal });

    // fetch не считает 404 или 500 исключением,
    // поэтому response.ok проверяем отдельно.
    if (!response.ok) {
      throw new ApiError(
        `Ошибка HTTP: ${response.status}`,
        response.status,
      );
    }

    // Преобразуем JSON и возвращаем данные нужного типа.
    return (await response.json()) as T;
  } catch (error) {
    // Отменённый запрос не превращаем в обычную сетевую ошибку.
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    // Если это уже наша ApiError,
    // просто передаём её выше.
    if (error instanceof ApiError) {
      throw error;
    }

    // Остальные ошибки считаем сетевыми.
    throw new ApiError("Ошибка сети", 0);
  }
}