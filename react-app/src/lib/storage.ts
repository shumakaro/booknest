import type {
  Book,
  Theme,
} from "../types";

// Ключи localStorage вынесены в константы,
// чтобы не писать строки вручную в разных местах.
const WISHLIST_KEY = "booknest-wishlist";
const THEME_KEY = "booknest-theme";

// Загружаем список желаемого из localStorage.
export function loadWishlist(): Book[] {
  try {
    const raw =
      localStorage.getItem(WISHLIST_KEY);

    // Если данных ещё нет,
    // возвращаем пустой массив.
    if (!raw) {
      return [];
    }

    return JSON.parse(raw) as Book[];
  } catch {
    // Если JSON повреждён,
    // приложение не должно падать.
    return [];
  }
}

// Сохраняем список желаемого.
export function saveWishlist(
  books: Book[],
): void {
  localStorage.setItem(
    WISHLIST_KEY,
    JSON.stringify(books),
  );
}

// Загружаем сохранённую тему.
export function loadTheme(): Theme {
  const value =
    localStorage.getItem(THEME_KEY);

  // Если сохранена тёмная тема,
  // возвращаем dark, иначе используем light.
  return value === "dark"
    ? "dark"
    : "light";
}

// Сохраняем выбранную пользователем тему.
export function saveTheme(
  theme: Theme,
): void {
  localStorage.setItem(
    THEME_KEY,
    theme,
  );
}