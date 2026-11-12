// Общий макет сохраняет навигацию и уведомления при смене страниц.
import { NoticeHost } from "../../components/NoticeHost";
import { useRef, useState } from "react";
import { toUserMessage } from "../../api/client";
import { RouteAccessibility } from "../../features/accessibility/RouteAccessibility";
import {
  NavLink,
  Outlet,
} from "react-router-dom";

import { useAuth } from "../../app/useAuth";
import { useTheme } from "../../app/useTheme";

function getNavClass({
  isActive,
}: {
  isActive: boolean;
}) {
  return isActive
    ? "nav-link nav-link--active"
    : "nav-link";
}

export function AppLayout() {
  const { user, logout } =
    useAuth();
  const [leaving, setLeaving] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const logoutLock = useRef(false);
  const main = useRef<HTMLElement>(null);
  async function leave() {
    if (logoutLock.current) return;
    logoutLock.current = true; setLeaving(true); setLogoutError("");
    try { await logout(); }
    catch (reason) { setLogoutError(toUserMessage(reason) + " Выход не подтвержден сервером. Повторите попытку."); }
    finally { logoutLock.current = false; setLeaving(false); }
  }

  const {
    theme,
    toggleTheme,
  } = useTheme();

  return (
    <div
      className="app"
      data-theme={theme}
    >
      <RouteAccessibility target={main} />
      <header className="site-header">
        <div>
          <h1>BookNest</h1>
          <p>
            Место для хороших историй
          </p>
        </div>

        <nav
          className="main-nav"
          aria-label="Основная навигация"
        >
          <NavLink
            to="/books"
            className={getNavClass}
          >
            Моя библиотека
          </NavLink>

          <NavLink to="/discover" className={getNavClass}>Глобальный поиск</NavLink>

          <NavLink
            to="/wishlist"
            className={getNavClass}
          >
            Желаемое
          </NavLink>

          {user && <NavLink to="/loans" className={getNavClass}>Выдачи</NavLink>}
          {user?.role === "librarian" && (
          <NavLink to="/librarian" className={getNavClass}>Библиотекарю</NavLink>
          )}
          {user?.role === "librarian" && (
          <NavLink
            to="/books/new"
            className={getNavClass}
          >
            Добавить книгу
          </NavLink>
          )}
        </nav>

        <div className="site-header__actions">
          <button
            type="button"
            aria-pressed={theme === "dark"}
            onClick={toggleTheme}
          >
            {theme === "light"
              ? "Тёмная тема"
              : "Светлая тема"}
          </button>

          {user ? (
            <button
              type="button"
              disabled={leaving}
              onClick={() => { void leave(); }}
            >
              {leaving ? "Выходим…" : "Выйти"}
            </button>
          ) : (
            <NavLink
              to="/login"
              className={getNavClass}
            >
              Войти
            </NavLink>
          )}
        </div>
      </header>

      <a className="skip-link" href="#main-content">Перейти к содержимому</a>
      <NoticeHost />
      <main ref={main} className="page" id="main-content" tabIndex={-1}>
        {user && <p className="session-account">{user.email} · {user.role === "librarian" ? "Библиотекарь" : "Читатель"}</p>}
        {logoutError && <p role="alert">{logoutError}</p>}
        <Outlet />
      </main>

      <footer>
        <p>BookNest · Ваша следующая история начинается здесь</p>
      </footer>
    </div>
  );
}
