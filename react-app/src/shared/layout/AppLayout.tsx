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

  const {
    theme,
    toggleTheme,
  } = useTheme();

  return (
    <div
      className="app"
      data-theme={theme}
    >
      <header className="site-header">
        <div>
          <h1>BookNest</h1>
          <p>
            Каталог книг Open Library
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
            Каталог
          </NavLink>

          <NavLink
            to="/wishlist"
            className={getNavClass}
          >
            Желаемое
          </NavLink>

          <NavLink
            to="/books/new"
            className={getNavClass}
          >
            Добавить книгу
          </NavLink>
        </nav>

        <div className="site-header__actions">
          <button
            type="button"
            onClick={toggleTheme}
          >
            {theme === "light"
              ? "Тёмная тема"
              : "Светлая тема"}
          </button>

          {user ? (
            <button
              type="button"
              onClick={logout}
            >
              Выйти
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

      <main className="page">
        <Outlet />
      </main>

      <footer>
        <p>BookNest</p>
      </footer>
    </div>
  );
}