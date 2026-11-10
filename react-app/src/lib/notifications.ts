// Уведомления не содержат серверных данных или токенов: только готовый текст для читателя.
export function notify(message: string) {
  globalThis.dispatchEvent(new CustomEvent<string>("booknest:notice", { detail: message }));
}
