import { notify } from "../../lib/notifications";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch, toUserMessage } from "../../api/client";
import { useAuth } from "../../app/useAuth";
import { ErrorBox } from "../../components/ErrorBox";
import { Spinner } from "../../components/Spinner";
import { useBookDetails } from "../../features/books/hooks/useBookDetails";

export function BookDetailsPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const { details, status, errorMessage, notFound, retry } = useBookDetails(bookId);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function issue() {
    if (!user) { navigate("/login", { state: { from: { pathname: `/books/${bookId}` } } }); return; }
    setPending(true); setMessage("");
    const due = new Date(); due.setDate(due.getDate() + 14);
    const dueDate = [due.getFullYear(), String(due.getMonth() + 1).padStart(2, "0"), String(due.getDate()).padStart(2, "0")].join("-");
    try { await apiFetch(`/books/${bookId}/loans`, { method: "POST", body: JSON.stringify({ due_date: dueDate }) }); notify("Книга выдана. Приятного чтения!"); setMessage("Книга выдана. Возврат доступен в разделе выдач."); retry(); }
    catch (reason) { setMessage(toUserMessage(reason)); }
    finally { setPending(false); }
  }
  async function remove() {
    if (!confirm("Удалить книгу из каталога?")) return;
    setPending(true);
    try { await apiFetch(`/books/${bookId}`, { method: "DELETE" }); notify("Книга удалена из каталога"); navigate("/books"); }
    catch (reason) { setMessage(toUserMessage(reason)); setPending(false); }
  }
  if (status === "loading") return <Spinner label="Загружаем информацию о книге..." />;
  if (status === "error") return <section><h2>{notFound ? "Книга не найдена" : "Не удалось загрузить книгу"}</h2><ErrorBox message={errorMessage} onRetry={retry} /><Link to="/books">Вернуться в каталог</Link></section>;
  if (!details) return <p>Данные книги отсутствуют.</p>;
  return <article><Link to="/books">Вернуться в каталог</Link><h2>{details.title}</h2>
    <p>Автор: {details.authors.map(author => author.name).join(", ") || "Не указан"}</p>
    <p>{details.description || "Описание отсутствует."}</p>
    <dl><dt>ISBN</dt><dd>{details.record?.isbn ?? "Не указан"}</dd><dt>Издательство</dt><dd>{details.record?.publisher}</dd>
      <dt>Язык</dt><dd>{details.record?.language}</dd><dt>Год первой публикации</dt><dd>{details.record?.year}</dd>
      <dt>Год издания</dt><dd>{details.record?.edition_year}</dd><dt>Страниц</dt><dd>{details.record?.pages}</dd>
      <dt>Доступно экземпляров</dt><dd>{details.record?.available}</dd></dl>
    {message && <p role="status">{message}</p>}
    <button disabled={pending || !details.record?.available} onClick={() => { void issue(); }}>{pending ? "Выполняется…" : "Взять книгу"}</button>
    <p><Link to="/loans">Перейти к выдачам</Link></p>
    {user?.role === "librarian" && <><p><Link to={`/books/${bookId}/edit`}>Редактировать книгу</Link></p>
      <button disabled={pending} onClick={() => { void remove(); }}>Удалить книгу</button></>}
  </article>;
}
