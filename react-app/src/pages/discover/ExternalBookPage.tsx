// Детали Open Library отделены от локальных форм, выдач и числовых идентификаторов.
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getGlobalBook } from "../../api/discover";
import type { ExternalDetails } from "../../api/discover";
import { toUserMessage } from "../../api/client";
import { ErrorBox } from "../../components/ErrorBox";
import { Spinner } from "../../components/Spinner";
import { ImportBookForm } from "./ImportBookForm";
import { BookCover, BookDescription, BookFacts } from "../../features/books/components/BookPresentation";

export function ExternalBookPage() {
  const { workId = "" } = useParams();
  const location = useLocation();
  const [details, setDetails] = useState<ExternalDetails | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const from: unknown = location.state?.from;
  const back = typeof from === "string" && from.startsWith("/discover?") ? from : "/discover";

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError(""); setDetails(null);
      try {
        const data = await getGlobalBook(workId, controller.signal);
        if (!controller.signal.aborted) setDetails(data);
      } catch (reason) {
        if (!controller.signal.aborted) setError(toUserMessage(reason));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [workId, revision]);

  return <article className="book-detail-page"><Link className="book-detail__back" to={back} state={{ restoreScrollY: location.state?.fromScrollY }}>Вернуться к глобальному поиску</Link>
    {loading && <Spinner label="Загружаем сведения Open Library…" />}
    {error && <ErrorBox message={error} onRetry={() => setRevision(value => value + 1)} />}
    {details && <div className="book-detail__layout"><aside className="book-detail__aside">
      <BookCover title={details.title} coverId={details.cover_id} />
      <p className="book-detail__source">Сведения из внешнего каталога</p>
      <a href={`https://openlibrary.org/works/${encodeURIComponent(details.id)}`} target="_blank" rel="noopener noreferrer">Открыть в Open Library</a>
    </aside><div className="book-detail__main"><p className="eyebrow">OPEN LIBRARY</p><h2>{details.title}</h2>
      <p className="book-detail__authors">{details.authors.join(", ") || "Автор не указан"}</p>
      <p className="book-detail__source">Это сведения о произведении. Наличие экземпляров и выдача доступны в моей библиотеке после добавления книги.</p>
      <BookFacts facts={[["Год первой публикации", details.year], ["Источник", "Open Library"]]} />
      <BookDescription key={details.id} text={details.description} />
      {details.notice && <p role="status">{details.notice}</p>}
      <ImportBookForm key={details.id} book={details} />
    </div></div>}
  </article>;
}
