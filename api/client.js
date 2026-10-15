/* ==========================================================================
   api/client.js — единый клиент для всех запросов к внешнему API.

   ВАЖНО (для защиты): это ЕДИНСТВЕННОЕ место во всём проекте, где вызывается
   fetch. Никакой другой модуль (ui/, main.js) не должен обращаться к сети
   напрямую.

   Этот модуль отвечает за:
   1. базовый URL;
   2. query-параметры;
   3. обработку сетевых ошибок;
   4. проверку response.ok;
   5. один автоматический повтор при ошибке 5xx.

   Модуль НЕ работает с DOM и ничего не выводит на страницу.
   ========================================================================== */

// Базовый адрес Open Library.
const BASE_URL = "https://openlibrary.org";

// Задержка перед повторным запросом при ошибке сервера.
const RETRY_DELAY = 500;

/* ------------------------------------------------------------------
   wait — простая функция ожидания.

   Нужна для того, чтобы перед повторным запросом при 5xx
   сделать небольшую задержку.
   ------------------------------------------------------------------ */
function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/* ------------------------------------------------------------------
   ApiError — собственный класс ошибки API.

   Дополнительно хранит:
     status  — HTTP-код ошибки;
     details — тело ответа сервера, если оно было.

   status = 0 используется для сетевой ошибки.
   ------------------------------------------------------------------ */
export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

/* ------------------------------------------------------------------
   request — универсальная функция запроса к API.

   Принимает:
     path    — путь относительно BASE_URL;
     options — настройки запроса.

   В options могут быть:
     params — query-параметры;
     signal — AbortSignal;
     method, headers, body и другие настройки fetch.

   Логика:
     1. собираем URL;
     2. выполняем запрос;
     3. если пришёл 5xx — ждём и повторяем один раз;
     4. если ошибка сети — бросаем ApiError со status = 0;
     5. если response.ok === false — бросаем ApiError;
     6. если всё хорошо — возвращаем JSON.
   ------------------------------------------------------------------ */
export async function request(path, options = {}) {
  // Отдельно получаем params и signal.
  // Остальные настройки сохраняются в rest.
  const { params, signal, ...rest } = options;

  // Создаём полный URL.
  const url = new URL(path, BASE_URL);

  // Добавляем query-параметры через URLSearchParams.
  if (params) {
    url.search = new URLSearchParams(params).toString();
  }

  let response;

  /* ----------------------------------------------------------------
     Максимум две попытки:
       attempt = 0 — первый запрос;
       attempt = 1 — один повтор после ошибки 5xx.
     ---------------------------------------------------------------- */
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetch(url, {
        headers: {
          Accept: "application/json",
          ...(rest.headers || {}),
        },

        signal,
        ...rest,
      });
    } catch (cause) {
      // AbortController специально отменил запрос.
      // Это не считается ошибкой приложения.
      if (cause.name === "AbortError") {
        throw cause;
      }

      // Если запрос вообще не выполнился:
      // нет интернета, DNS, CORS и т.д.
      throw new ApiError(
        0,
        "Нет соединения с сервером",
        cause
      );
    }

    // Если это первая попытка и сервер вернул 5xx,
    // ждём 500 мс и повторяем запрос.
    if (
      response.status >= 500 &&
      response.status < 600 &&
      attempt === 0
    ) {
      await wait(RETRY_DELAY);
      continue;
    }

    // В остальных случаях повтор больше не нужен.
    break;
  }

  /* ----------------------------------------------------------------
     fetch НЕ выбрасывает ошибку автоматически при 404, 500 и т.д.

     Поэтому обязательно проверяем response.ok вручную.
     ---------------------------------------------------------------- */
  if (!response.ok) {
    // Пытаемся получить тело ошибки.
    // Если сервер прислал не JSON — просто получим null.
    const body = await response.json().catch(() => null);

    throw new ApiError(
      response.status,
      body?.detail ||
        body?.error ||
        response.statusText ||
        "Ошибка запроса",
      body
    );
  }

  // Код 204 означает успешный ответ без тела.
  if (response.status === 204) {
    return null;
  }

  // Успешный ответ преобразуем из JSON.
  return response.json();
}