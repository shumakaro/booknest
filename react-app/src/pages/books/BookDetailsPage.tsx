import { notify } from "../../lib/notifications";
import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { apiFetch, toUserMessage } from "../../api/client";
import { useAuth } from "../../app/useAuth";
import { ErrorBox } from "../../components/ErrorBox";
import { Spinner } from "../../components/Spinner";
import { useBookDetails } from "../../features/books/hooks/useBookDetails";
import { BookCover, BookDescription, BookFacts } from "../../features/books/components/BookPresentation";

export function BookDetailsPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const { details, status, errorMessage, notFound, retry } = useBookDetails(bookId);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Возврат разрешен только во внутренний каталог; прямое открытие тоже работает.
  const from: unknown = location.state?.from;
  const back = typeof from === "string" && (from === "/books" || from.startsWith("/books?")) ? from : "/books";
  const backState = { restoreScrollY: location.state?.fromScrollY };
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState(false);
  const [pending, setPending] = useState(false);
  async function issue() {
    if (!user) { navigate("/login", { state: { from: { pathname: `/books/${bookId}` } } }); return; }
    setPending(true); setMessage(""); setActionError(false);
    const due = new Date(); due.setDate(due.getDate() + 14);
    const dueDate = [due.getFullYear(), String(due.getMonth() + 1).padStart(2, "0"), String(due.getDate()).padStart(2, "0")].join("-");
    try { await apiFetch(`/books/${bookId}/loans`, { method: "POST", body: JSON.stringify({ due_date: dueDate }) }); notify("Книга выдана. Приятного чтения!"); setMessage("Книга выдана. Возврат доступен в разделе выдач."); retry(); }
    catch (reason) { setActionError(true); setMessage(toUserMessage(reason)); }
    finally { setPending(false); }
  }
  async function remove() {
    if (!confirm("Удалить книгу из каталога?")) return;
    setPending(true); setActionError(false);
    try { await apiFetch(`/books/${bookId}`, { method: "DELETE" }); notify("Книга удалена из каталога"); navigate(back); }
    catch (reason) { setActionError(true); setMessage(toUserMessage(reason)); setPending(false); }
  }
  if (status === "loading") return <Spinner label="Загружаем информацию о книге..." />;
  if (status === "error") return <section><h2>{notFound ? "Книга не найдена" : "Не удалось загрузить книгу"}</h2><ErrorBox message={errorMessage} onRetry={retry} /><Link to={back} state={backState}>Вернуться в каталог</Link></section>;
  if (!details) return <p>Данные книги отсутствуют.</p>;
  const record = details.record;
  return <article className="book-detail-page"><Link className="book-detail__back" to={back} state={backState}>Вернуться в каталог</Link>
    <div className="book-detail__layout"><aside className="book-detail__aside">
      <BookCover title={details.title} coverId={record?.cover_id} />
      <p className="book-detail__source">Книга из моей библиотеки</p>
      {record?.external_work_id && <a href={`https://openlibrary.org/works/${encodeURIComponent(record.external_work_id)}`} target="_blank" rel="noopener noreferrer">Источник в Open Library</a>}
    </aside><div className="book-detail__main"><p className="eyebrow">МОЯ БИБЛИОТЕКА</p><h2>{details.title}</h2>
      <p className="book-detail__authors">{details.authors.map(author => author.name).join(", ") || "Автор не указан"}</p>
      <section className="book-detail__availability" aria-label="Наличие в библиотеке">
        <strong>{record?.available === undefined ? "Наличие пока неизвестно" : record.total_copies === 0 ? "Экземпляры пока не добавлены" : record.available > 0 ? `Доступно экземпляров: ${record.available}` : "Все экземпляры выданы"}</strong>
        <p>Выдачи и возвраты учитываются в моей библиотеке.</p>
      </section>
    {/* Успех уже объявляется глобальным уведомлением; здесь остается постоянный текст. */}
    {message && <p role={actionError ? "alert" : undefined}>{message}</p>}
      <div className="book-detail__actions"><button className="btn btn--primary" disabled={pending || !record?.available} onClick={() => { void issue(); }}>{pending ? "Выполняется…" : user ? "Взять книгу" : "Войти, чтобы взять книгу"}</button>
        <Link to="/loans">Перейти к выдачам</Link></div>
      <BookFacts facts={[["ISBN", record?.isbn], ["Издательство", record?.publisher], ["Язык", record?.language],
        ["Год первой публикации", record?.year], ["Год издания", record?.edition_year], ["Страниц", record?.pages], ["Всего экземпляров", record?.total_copies]]} />
      {record?.external_work_id && <p className="book-detail__source">Сведения о конкретном издании импортированной книги могут требовать уточнения: издательство, язык, год издания и число страниц проверяются отдельно.</p>}
      <BookDescription key={details.id} text={details.description} />
      {user?.role === "librarian" && <section className="book-detail__management" aria-label="Управление книгой"><h3>Управление книгой</h3>
        <div className="book-detail__actions"><Link to={`/books/${bookId}/edit`}>Редактировать книгу</Link>
          <button className="btn btn--ghost" disabled={pending} onClick={() => { void remove(); }}>Удалить книгу</button></div></section>}
    </div></div></article>;
}
