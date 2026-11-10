// Импорт не подменяет создание вручную; год и число экземпляров подтверждает библиотекарь.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../app/useAuth";
import { apiFetch, toUserMessage } from "../../api/client";
import type { BookRead } from "../../api/generated";
import type { ExternalDetails } from "../../api/discover";
import { BookFacts } from "../../features/books/components/BookPresentation";

interface Props { book: ExternalDetails }

export function ImportBookForm({ book }: Props) {
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [local, setLocal] = useState<BookRead | null>(null);
  const [year, setYear] = useState(String(book.year ?? ""));
  const [copies, setCopies] = useState("1");
  const inFlight = useRef(false);
  const resultLink = useRef<HTMLAnchorElement>(null);
  // После исчезновения формы клавиатурный фокус переходит к полезному действию.
  useEffect(() => { if (local) resultLink.current?.focus(); }, [local]);
  if (user?.role !== "librarian") return <p>Добавлять внешние книги в библиотеку может библиотекарь.</p>;
  if (local) return <section className="book-import" aria-label="Результат импорта"><p role="status">Книга есть в библиотеке. <Link ref={resultLink} to={`/books/${local.id}`}>Открыть библиотечную запись</Link></p>
    {local.title && <p>{local.title}</p>}{local.total_copies !== undefined && <p>Экземпляров в библиотеке: {local.total_copies}</p>}
    <p>Повторный импорт сохраняет существующую запись, ручные правки и количество экземпляров.</p>
    <Link to={`/books/${local.id}/edit`}>Проверить характеристики издания</Link></section>;
  const missingAuthor = !book.authors[0]?.trim();
  return <section className="book-import" aria-label="Импорт книги"><h3>Добавить в мою библиотеку</h3>
    <p>Проверьте сведения перед добавлением. Повторный импорт не увеличивает число экземпляров и не перезаписывает ручные правки.</p>
    <p>Источник описывает произведение. После добавления проверьте издательство, язык, год издания и число страниц в форме редактирования.</p>
    <BookFacts facts={[["Название записи", book.title], ["Автор записи", book.authors[0]], ["Источник", "Open Library"]]} />
    {book.authors.length > 1 && <p>В локальную запись переносится первый автор. Полный список авторов показан выше.</p>}
    {missingAuthor && <p>Автор не указан источником. Добавление станет доступно после получения сведений об авторе.</p>}
    {book.year !== null && (book.year < 1450 || book.year > 2100) && <p>Год источника вне допустимого диапазона 1450–2100. Перед добавлением уточните дату первой публикации.</p>}
    <form aria-label="Параметры импорта" aria-busy={pending} onSubmit={async event => {
      event.preventDefault();
      // Ref закрывает повтор даже для двух submit в одном кадре до обновления React.
      if (inFlight.current || missingAuthor || !event.currentTarget.checkValidity()) return;
      inFlight.current = true;
      setPending(true); setError("");
      try {
        const result = await apiFetch<BookRead>("/discover/imports", { method: "POST", body: JSON.stringify({
          work_id: book.id, year: Number(year), total_copies: Number(copies),
        }) });
        setLocal(result);
      } catch (reason) { setError(toUserMessage(reason)); }
      finally { inFlight.current = false; setPending(false); }
    }}>
      <fieldset disabled={pending}><legend className="visually-hidden">Проверенные параметры новой записи</legend><div className="book-import__fields">
        <label>Год первой публикации<input name="year" type="number" min={1450} max={2100} step={1} required value={year} onChange={event => setYear(event.target.value)} /></label>
        <label>Количество экземпляров<input name="copies" type="number" min={1} max={10000} step={1} required value={copies} onChange={event => setCopies(event.target.value)} /></label>
      </div><button className="btn btn--primary book-import__submit" disabled={missingAuthor}>{pending ? "Добавляем…" : "Добавить в библиотеку"}</button></fieldset>
    </form>{error && <p role="alert">{error}</p>}
    <p><Link to="/books/new">Добавить книгу вручную</Link></p>
  </section>;
}
