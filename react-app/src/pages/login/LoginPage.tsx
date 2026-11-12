import { useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch, toUserMessage } from "../../api/client";
import { useAuth } from "../../app/useAuth";
import { safeReturnTo } from "../../features/auth/returnTo";
import "../../features/auth/Auth.css";

// Одна понятная форма обслуживает вход и регистрацию, сохраняя доступные подписи полей.
export function LoginPage({ register = false }: { register?: boolean }) {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const lock = useRef(false);
  const passwordInput = useRef<HTMLInputElement>(null);
  const errorBox = useRef<HTMLParagraphElement>(null);
  const from = location.state?.from;
  const desired = safeReturnTo(params.get("returnTo") ?? (typeof from === "string" ? from : (from?.pathname ?? "/books") + (from?.search ?? "") + (from?.hash ?? "")));
  const nextPath = (register ? "/login" : "/register") + "?" + new URLSearchParams({ returnTo: desired });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || loading) return;
    const element = event.currentTarget;
    const form = new FormData(element);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (register && (!/[\p{L}]/u.test(password) || !/\d/.test(password) || password.length < 8 || new TextEncoder().encode(password).length > 72)) {
      setError("Пароль должен содержать от 8 символов, буквы и цифры и занимать не более 72 байт. Русские буквы занимают несколько байт.");
      setFieldError("password"); passwordInput.current?.focus();
      return;
    }
    lock.current = true; setError(""); setFieldError(""); setNotice(""); setBusy(true);
    try {
      if (register) {
        await apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) });
        setNotice("Регистрация завершена. Теперь можно войти.");
        setRegisteredEmail(email); element.reset(); setShowPassword(false);
      } else {
        await login(email, password);
        navigate(desired, { replace: true });
      }
    } catch (reason) { setError(toUserMessage(reason)); requestAnimationFrame(() => errorBox.current?.focus()); }
    finally { lock.current = false; setBusy(false); }
  }

  return <section className="auth-page"><h2>{register ? "Регистрация" : "Вход"}</h2>
    <p className="auth-help">{register ? "Создайте учетную запись читателя. Роль библиотекаря через эту форму не назначается." : "Войдите, чтобы сохранять книги и оформлять выдачи."}</p>
    {!register && params.get("reason") === "session-expired" && <p role="status">Сеанс завершен. Войдите снова, чтобы продолжить.</p>}
    {loading && <p role="status">Проверяем текущий сеанс…</p>}
    <form onSubmit={submit}>
      <fieldset disabled={busy || loading || Boolean(notice)}><legend className="visually-hidden">Данные для {register ? "регистрации" : "входа"}</legend>
      <p><label htmlFor="auth-email">E-mail</label><input id="auth-email" name="email" type="email" required autoComplete="username" defaultValue={location.state?.registeredEmail ?? ""} /></p>
      <div><label htmlFor="auth-password">Пароль</label><div className="auth-password"><input ref={passwordInput} id="auth-password" name="password" type={showPassword ? "text" : "password"} required minLength={register ? 8 : 1} maxLength={72} autoComplete={register ? "new-password" : "current-password"}
        aria-invalid={fieldError === "password" || undefined} aria-describedby={register ? "auth-help" : undefined} />
        <button type="button" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? "Скрыть пароль" : "Показать пароль"}</button></div></div>
      {register && <p className="auth-help" id="auth-help">От 8 символов, буквы и цифры. Максимум 72 байта: кириллица занимает больше одного байта на букву.</p>}
      <button disabled={busy}>{busy ? "Подождите..." : register ? "Зарегистрироваться" : "Войти"}</button>
      </fieldset>
      {error && <p ref={errorBox} role="alert" tabIndex={-1}>{error}</p>}{notice && <p role="status">{notice}</p>}
    </form>
    {!busy && <p><Link to={nextPath} state={{ registeredEmail }}>{register ? "Перейти ко входу" : "Создать учётную запись"}</Link></p>}
  </section>;
}
