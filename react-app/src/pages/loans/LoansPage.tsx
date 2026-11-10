import { notify } from "../../lib/notifications";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, toUserMessage } from "../../api/client";
import type { LoanRead, Page_LoanRead_ } from "../../api/generated";
import { Spinner } from "../../components/Spinner";
import { ErrorBox } from "../../components/ErrorBox";

export function LoansPage() {
  const [items, setItems] = useState<LoanRead[]>([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setStatus("loading");
      try {
        const data = await apiFetch<Page_LoanRead_>(`/loans?page=${page}&size=20`, { signal: controller.signal });
        if (!controller.signal.aborted) { setItems(data.items); setTotal(data.total); setStatus("success"); }
      } catch (reason) { if (!controller.signal.aborted) { setError(toUserMessage(reason)); setStatus("error"); } }
    }
    void load(); return () => controller.abort();
  }, [revision, page]);
  async function returnBook(id: number) {
    setPending(id); setError("");
    try { await apiFetch(`/loans/${id}`, { method: "PATCH", body: JSON.stringify({ state: "returned" }) }); notify("Книга возвращена. Спасибо!"); setRevision(value => value + 1); }
    catch (reason) { setError(toUserMessage(reason)); }
    finally { setPending(null); }
  }
  return <section><h2>Выдачи книг</h2>
    {status === "loading" && <Spinner label="Загружаем выдачи..." />}
    {status === "error" && <ErrorBox message={error} onRetry={() => setRevision(value => value + 1)} />}
    {status === "success" && <>{error && <p role="alert">{error}</p>}
      {items.length === 0 ? <p>Выдач пока нет.</p> : <ul>{items.map(loan => <li key={loan.id}>
        <Link to={`/books/${loan.book_id}`}>Книга №{loan.book_id}</Link> — читатель №{loan.user_id}, срок {loan.due_date}.
        {loan.returned_at ? <span> Возвращена {loan.returned_at}</span> : <button disabled={pending !== null} onClick={() => { void returnBook(loan.id); }}>{pending === loan.id ? "Возвращаем…" : `Вернуть книгу №${loan.book_id}`}</button>}
      </li>)}</ul>}
      <button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Предыдущая</button>
      <button disabled={page * 20 >= total} onClick={() => setPage(value => value + 1)}>Следующая</button>
    </>}
  </section>;
}
