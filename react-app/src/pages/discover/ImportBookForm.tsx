// Импорт не подменяет создание вручную; год и число экземпляров подтверждает библиотекарь.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../app/useAuth";
import { apiFetch, toUserMessage } from "../../api/client";
import type { BookRead } from "../../api/generated";
import type { ExternalDetails } from "../../api/discover";

interface Props { book: ExternalDetails }

export function ImportBookForm({ book }: Props) {
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [local, setLocal] = useState<BookRead | null>(null);
  if (user?.role !== "librarian") return <p>Добавлять внешние книги в библиотеку может библиотекарь.</p>;
  if (local) return <p role="status">Книга есть в библиотеке. <Link to={`/books/${local.id}`}>Открыть библиотечную запись</Link></p>;
  return <section><h3>Добавить в мою библиотеку</h3>
    <p>Проверьте год первой публикации. Повторное нажатие не увеличивает число экземпляров.</p>
    <form className="global-search-form" onSubmit={async event => {
      event.preventDefault();
      if (pending) return;
      const data = new FormData(event.currentTarget);
      setPending(true); setError("");
      try {
        const result = await apiFetch<BookRead>("/discover/imports", { method: "POST", body: JSON.stringify({
          work_id: book.id, year: Number(data.get("year")), total_copies: Number(data.get("copies")),
        }) });
        setLocal(result);
      } catch (reason) { setError(toUserMessage(reason)); }
      finally { setPending(false); }
    }}>
      <label>Год первой публикации<input name="year" type="number" min={1450} max={2100} required defaultValue={book.year ?? ""} /></label>
      <label>Количество экземпляров<input name="copies" type="number" min={1} max={10000} required defaultValue={1} /></label>
      <button disabled={pending}>{pending ? "Добавляем…" : "Добавить в библиотеку"}</button>
    </form>{error && <p role="alert">{error}</p>}
  </section>;
}
