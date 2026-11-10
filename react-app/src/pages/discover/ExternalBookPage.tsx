// Детали Open Library отделены от локальных форм, выдач и числовых идентификаторов.
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getGlobalBook } from "../../api/discover";
import type { ExternalDetails } from "../../api/discover";
import { toUserMessage } from "../../api/client";
import { ErrorBox } from "../../components/ErrorBox";
import { Spinner } from "../../components/Spinner";
import { ImportBookForm } from "./ImportBookForm";

export function ExternalBookPage() {
  const { workId = "" } = useParams();
  const location = useLocation();
  const [details, setDetails] = useState<ExternalDetails | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [failedCover, setFailedCover] = useState<number | null>(null);
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

  return <article><Link to={back}>Вернуться к глобальному поиску</Link>
    {loading && <Spinner label="Загружаем сведения Open Library…" />}
    {error && <ErrorBox message={error} onRetry={() => setRevision(value => value + 1)} />}
    {details && <><p className="eyebrow">OPEN LIBRARY</p><h2>{details.title}</h2>
      <p>{details.authors.join(", ") || "Автор не указан"}</p>
      <p>Год первой публикации: {details.year ?? "не указан"}</p>
      {details.cover_id && failedCover !== details.cover_id
        ? <img className="external-cover" src={`https://covers.openlibrary.org/b/id/${details.cover_id}-L.jpg`}
          alt={`Обложка книги ${details.title}`} onError={() => setFailedCover(details.cover_id)} />
        : <p>Обложка отсутствует или недоступна.</p>}
      <p className="external-description">{details.description || "Описание отсутствует."}</p>
      {details.notice && <p role="status">{details.notice}</p>}
      <a href={`https://openlibrary.org/works/${details.id}`} target="_blank" rel="noopener noreferrer">Открыть в Open Library</a>
      <ImportBookForm key={details.id} book={details} />
    </>}
  </article>;
}
