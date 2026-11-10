// Общий макет сохраняет навигацию и уведомления при смене страниц.
import { NoticeHost } from "../../components/NoticeHost";
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

      <a className="skip-link" href="#main-content">Перейти к содержимому</a>
      <NoticeHost />
      <main className="page" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>

      <footer>
        <p>BookNest · Ваша следующая история начинается здесь</p>
      </footer>
    </div>
  );
}
