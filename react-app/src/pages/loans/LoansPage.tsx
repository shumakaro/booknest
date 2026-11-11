// ЛР10: сервер разделяет выдачи до пагинации; клиент не фильтрует лишь первую страницу.
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch, toUserMessage } from "../../api/client";
import type { LoanRead, Page_LoanRead_ } from "../../api/generated";
import { useAuth } from "../../app/useAuth";
import { Spinner } from "../../components/Spinner";
import { ErrorBox } from "../../components/ErrorBox";
import { EmptyState } from "../../components/EmptyState";
import { notify } from "../../lib/notifications";
import { formatLoanDate, loanState } from "../../features/loans/dates";
import "../../features/loans/Loans.css";

const filters = [["active", "Текущие"], ["overdue", "Просроченные"], ["returned", "История"], ["all", "Все"]] as const;
const size = 20;
export function LoansPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filter = filters.some(([key]) => key === params.get("state")) ? params.get("state")! : "active";
  const rawPage = params.get("page") ?? "1";
  const page = /^\d+$/.test(rawPage) && Number(rawPage) >= 1 && Number(rawPage) <= 1000000 ? Number(rawPage) : 1;
  const [items, setItems] = useState<LoanRead[]>([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const lock = useRef(false);
  const restored = useRef<string | null>(null);
  const pages = Math.max(1, Math.ceil(total / size));
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setStatus("loading"); setError("");
      try {
        const data = await apiFetch<Page_LoanRead_>(`/loans?state=${filter}&page=${page}&size=${size}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        const last = Math.max(1, Math.ceil(data.total / size));
        // После возврата последней книги страница может исчезнуть: читаем последнюю существующую.
        if (page > last) { setParams({ state: filter, ...(last > 1 ? { page: String(last) } : {}) }, { replace: true }); return; }
        setItems(data.items); setTotal(data.total); setStatus("success");
      } catch (reason) { if (!controller.signal.aborted) { setError(toUserMessage(reason)); setStatus("error"); } }
    }
    void load(); return () => controller.abort();
  }, [revision, page, filter, user?.id, setParams]);
  useEffect(() => {
    const top: unknown = location.state?.restoreScrollY;
    if (status !== "success" || typeof top !== "number" || !Number.isFinite(top) || top < 0 || restored.current === location.key) return;
    const frame = requestAnimationFrame(() => { window.scrollTo({ top, behavior: "instant" }); restored.current = location.key; });
    return () => cancelAnimationFrame(frame);
  }, [status, location.key, location.state]);
  async function returnBook(loan: LoanRead) {
    if (lock.current) return;
    lock.current = true; setPending(loan.id); setActionError(""); setMessage("");
    try {
      await apiFetch(`/loans/${loan.id}`, { method: "PATCH", body: JSON.stringify({ state: "returned" }) });
      // Успех показывается только после ответа сервера, затем перечитывается текущая выборка.
      notify("Книга возвращена. Спасибо!"); setMessage("Возврат сохранен. Наличие обновится при открытии книги.");
      setRevision(value => value + 1);
    } catch (reason) { setActionError(toUserMessage(reason) + " Список не изменен; при конфликте обновите выдачи."); }
    finally { lock.current = false; setPending(null); }
  }
  return <section className="loans-page"><h2>Выдачи книг</h2>
    <p className="loans-intro">{user?.role === "librarian" ? "Выдачи всех читателей. Вернуть можно только активную выдачу." : "Ваши книги и история возвратов. Срок указан включительно."}</p>
    <div className="loans-filters" role="group" aria-label="Состояние выдач">{filters.map(([key, label]) =>
      <button key={key} type="button" aria-pressed={filter === key} disabled={pending !== null}
        onClick={() => { setParams({ state: key }); setActionError(""); setMessage(""); }}>{label}</button>)}</div>
    {message && <p>{message}</p>}
    {actionError && <div><p role="alert">{actionError}</p><button disabled={pending !== null} onClick={() => { setActionError(""); setRevision(value => value + 1); }}>Обновить выдачи</button></div>}
    {status === "loading" && <Spinner label="Загружаем выдачи…" />}
    {status === "error" && <ErrorBox message={error} onRetry={() => setRevision(value => value + 1)} />}
    {status === "success" && <>
      <p role="status">{total > 0 ? `Показаны ${((page - 1) * size) + 1}–${Math.min(page * size, total)} из ${total}` : "Найдено выдач: 0"}</p>
      {items.length === 0 ? <><EmptyState title={filter === "returned" ? "История возвратов пока пуста" : filter === "overdue" ? "Просроченных выдач нет" : filter === "active" ? "Текущих выдач нет" : "Выдач пока нет"}
        message="Можно выбрать другой раздел или открыть книгу в библиотеке." /><Link to="/books">Открыть библиотеку</Link></> :
        <ul className="loan-list">{items.map(loan => {
          const state = loanState(loan);
          const title = loan.book_title || `Книга №${loan.book_id}`;
          return <li key={loan.id} className="loan-card"><div className="loan-card__heading"><h3><Link to={`/books/${loan.book_id}`}
            onClick={event => {
              // Позиция берется в момент перехода, а не при первом рендере списка.
              if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              navigate(`/books/${loan.book_id}`, { state: { from: location.pathname + location.search, fromScrollY: window.scrollY } });
            }}>{title}</Link></h3>
            <span className={`badge loan-state loan-state--${state.kind}`}>{state.label}</span></div>
            <dl><div><dt>Выдана</dt><dd><time dateTime={loan.issued_at}>{formatLoanDate(loan.issued_at)}</time></dd></div>
              <div><dt>Вернуть до</dt><dd><time dateTime={loan.due_date}>{formatLoanDate(loan.due_date)}</time></dd></div>
              {loan.returned_at && <div><dt>Возвращена</dt><dd><time dateTime={loan.returned_at}>{formatLoanDate(loan.returned_at)}</time></dd></div>}
              {user?.role === "librarian" && <div><dt>Читатель</dt><dd>№{loan.user_id}</dd></div>}</dl>
            {!loan.returned_at && <button type="button" disabled={pending !== null} onClick={() => { void returnBook(loan); }}>
              {pending === loan.id ? "Возвращаем…" : `Вернуть «${title}»`}</button>}
          </li>;
        })}</ul>}
      {total > 0 && <nav className="pagination" aria-label="Страницы выдач"><button disabled={pending !== null || page <= 1} onClick={() => setParams({ state: filter, page: String(page - 1) })}>Предыдущая</button>
        <span>Страница {page} из {pages}</span><button disabled={pending !== null || page >= pages} onClick={() => setParams({ state: filter, page: String(page + 1) })}>Следующая</button></nav>}
    </>}
  </section>;
}
