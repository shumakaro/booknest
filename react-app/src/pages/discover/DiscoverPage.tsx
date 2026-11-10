// Состояние поиска находится в URL, но запрос отправляется только после формы.
import { useEffect, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { externalCard } from "../../api/discover";
import { BookCard } from "../../components/BookCard";
import { CatalogSkeleton } from "../../components/CatalogSkeleton";
import { EmptyState } from "../../components/EmptyState";
import { ErrorBox } from "../../components/ErrorBox";
import { useGlobalBooks } from "../../features/books/hooks/useGlobalBooks";
import { AnimatedResults } from "../../features/books/components/AnimatedResults";

export function DiscoverPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const title = (params.get("title") ?? "").trim();
  const author = (params.get("author") ?? "").trim();
  const rawPage = Number(params.get("page"));
  const page = Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 1000 ? rawPage : 1;
  const { books, total, hasMore, status, error, retry, restored } = useGlobalBooks(title, author, page);
  const restoredLocation = useRef<string | null>(null);

  // Позиция передается через состояние навигации, а не через URL или хранилище.
  // Восстановление выполняется после появления карточек, когда странице хватает высоты.
  useEffect(() => {
    const top: unknown = location.state?.restoreScrollY;
    if (status !== "success" || typeof top !== "number" || !Number.isFinite(top) || top < 0
      || restoredLocation.current === location.key) return;
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top, behavior: "instant" });
      restoredLocation.current = location.key;
    });
    return () => cancelAnimationFrame(frame);
  }, [status, books.length, location.key, location.state]);

  return <section className="catalog-page">
    <div className="catalog-intro"><p className="eyebrow">ГЛОБАЛЬНЫЙ ПОИСК</p>
      <h2>Книги за пределами<br />нашей полки</h2>
      <p>Найдите произведение в Open Library по названию, автору или обоим полям.</p>
    </div>
    <form className="global-search-form" key={JSON.stringify([title, author])} onSubmit={event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const nextTitle = String(data.get("title") ?? "").trim();
      const nextAuthor = String(data.get("author") ?? "").trim();
      if (!nextTitle && !nextAuthor) return;
      if (title === nextTitle && author === nextAuthor && page === 1) retry();
      else setParams({ title: nextTitle, author: nextAuthor, page: "1" });
    }}>
      <label>Название книги<input name="title" defaultValue={title} maxLength={200} placeholder="Например, Гарри Поттер" /></label>
      <label>Автор<input name="author" defaultValue={author} maxLength={200} placeholder="Например, Джоан Роулинг" /></label>
      <button type="submit">Найти в Open Library</button>
    </form>
    <p className="catalog-source-note">Это внешний каталог. Выдачи и желаемое доступны для книг в разделе «Моя библиотека».</p>
    {status === "idle" && <p>Введите название или автора, затем нажмите «Найти в Open Library».</p>}
    {status === "loading" && books.length === 0 && <CatalogSkeleton />}
    {(status === "empty" || (status === "success" && !books.length)) && <EmptyState title="Книги не найдены" message="Попробуйте другое название или имя автора, в том числе на языке оригинала." />}
    {books.length > 0 && <><p role="status">Найдено в Open Library: {total}. Загружено: {books.length}.</p>
      <AnimatedResults key={JSON.stringify([title, author])} label="Результаты глобального поиска" animate={!restored}>{books.map(book => <BookCard key={book.id} book={externalCard(book)}
        inWishlist={false} sourceLabel="Open Library" onDetails={() => navigate(`/discover/${book.id}`, {
          state: { from: location.pathname + location.search, fromScrollY: window.scrollY },
        })} />)}</AnimatedResults></>}
    {status === "error" && <ErrorBox message={error} onRetry={retry} />}
    {/* Уже загруженные карточки остаются доступны при ожидании или ошибке следующей страницы. */}
    {status === "loading" && books.length > 0 && <CatalogSkeleton count={3} label="Загружаем следующую страницу" />}
    {hasMore && status !== "error" && <div className="load-more-panel"><button className="load-more-button" type="button"
      disabled={status === "loading"} aria-busy={status === "loading"} onClick={() => {
      const next = new URLSearchParams(params); next.set("page", String(page + 1)); setParams(next);
    }}>{status === "loading" ? "Загружаем…" : "Показать ещё"}</button>
      <p>Загруженные книги останутся в списке.</p></div>}
    {status === "success" && !hasMore && books.length > 0 && <p role="status">Доступные результаты закончились.</p>}
  </section>;
}
