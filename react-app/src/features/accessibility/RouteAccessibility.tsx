// ЛР10: смена страницы объявляется заголовком вкладки и фокусом main без изменения прокрутки.
import { useEffect, useRef, type RefObject } from "react";
import { useLocation } from "react-router-dom";
import "./Accessibility.css";

function pageTitle(path: string) {
  if (path === "/books/new") return "Добавить книгу";
  if (/^\/books\/[^/]+\/edit$/.test(path)) return "Редактировать книгу";
  if (path === "/books") return "Моя библиотека";
  if (path.startsWith("/books/")) return "Книга";
  if (path === "/discover") return "Глобальный поиск";
  if (path.startsWith("/discover/")) return "Результат глобального поиска";
  return ({ "/wishlist": "Желаемое", "/loans": "Выдачи", "/librarian": "Библиотекарю", "/login": "Вход", "/register": "Регистрация" } as Record<string, string>)[path] ?? "Страница";
}
export function RouteAccessibility({ target }: { target: RefObject<HTMLElement | null> }) {
  const { pathname } = useLocation();
  const previous = useRef(pathname);
  useEffect(() => {
    document.title = `${pageTitle(pathname)} — BookNest`;
    // Query меняется при вводе/фильтрации: у поля нельзя забирать фокус на каждую букву.
    if (previous.current !== pathname) target.current?.focus({ preventScroll: true });
    previous.current = pathname;
  }, [pathname, target]);
  return null;
}
