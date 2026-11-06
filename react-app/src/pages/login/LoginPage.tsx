import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch, toUserMessage } from "../../api/client";
import { useAuth } from "../../app/useAuth";

// Одна понятная форма обслуживает вход и регистрацию, сохраняя доступные подписи полей.
export function LoginPage({ register = false }: { register?: boolean }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    if (register && (!/[\p{L}]/u.test(password) || !/\d/.test(password) || password.length < 8)) {
      setError("Пароль должен содержать не менее 8 символов, буквы и цифры.");
      return;
    }
    setError(""); setBusy(true);
    try {
      if (register) {
        await apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) });
        setNotice("Регистрация завершена. Теперь можно войти.");
      } else {
        await login(email, password);
        const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
        const desired = params.get("returnTo") ?? ((from?.pathname ?? "/books") + (from?.search ?? ""));
        navigate(desired.startsWith("/") && !desired.startsWith("//") ? desired : "/books", { replace: true });
      }
    } catch (reason) { setError(toUserMessage(reason)); }
    finally { setBusy(false); }
  }

  return <section><h2>{register ? "Регистрация" : "Вход"}</h2>
    <form onSubmit={submit}>
      <p><label htmlFor="auth-email">E-mail</label><input id="auth-email" name="email" type="email" required autoComplete="username" /></p>
      <p><label htmlFor="auth-password">Пароль</label><input id="auth-password" name="password" type="password" required minLength={register ? 8 : 1} maxLength={72} autoComplete={register ? "new-password" : "current-password"} /></p>
      {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
      <button disabled={busy}>{busy ? "Подождите..." : register ? "Зарегистрироваться" : "Войти"}</button>
    </form>
    <p><Link to={register ? "/login" : "/register"}>{register ? "Перейти ко входу" : "Создать учётную запись"}</Link></p>
  </section>;
}
