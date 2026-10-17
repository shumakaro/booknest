import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../app/useAuth";

interface LocationState {
  from?: {
    pathname?: string;
  };
}

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as LocationState | null;
  const destination = state?.from?.pathname ?? "/books";

  function handleLogin() {
    login();
    navigate(destination, { replace: true });
  }

  return (
    <section>
      <h2>Вход</h2>

      {user ? (
        <p>Пользователь уже вошёл.</p>
      ) : (
        <>
          <p>Пока используется тестовая авторизация.</p>

          <button
            type="button"
            onClick={handleLogin}
          >
            Войти как тестовый читатель
          </button>
        </>
      )}
    </section>
  );
}