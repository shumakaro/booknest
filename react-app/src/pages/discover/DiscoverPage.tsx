// Состояние поиска находится в URL, но запрос отправляется только после формы.
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { externalCard } from "../../api/discover";
import { BookCard } from "../../components/BookCard";
import { CatalogSkeleton } from "../../components/CatalogSkeleton";
import { EmptyState } from "../../components/EmptyState";
import { ErrorBox } from "../../components/ErrorBox";
import { useGlobalBooks } from "../../features/books/hooks/useGlobalBooks";

export function DiscoverPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const title = (params.get("title") ?? "").trim();
  const author = (params.get("author") ?? "").trim();
  const rawPage = Number(params.get("page"));
  const page = Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 1000 ? rawPage : 1;
  const { books, total, hasMore, status, error, retry } = useGlobalBooks(title, author, page);

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
      <div className="book-list">{books.map(book => <BookCard key={book.id} book={externalCard(book)}
        inWishlist={false} sourceLabel="Open Library" onDetails={() => navigate(`/discover/${book.id}`, {
          state: { from: location.pathname + location.search },
        })} />)}</div></>}
    {status === "error" && <ErrorBox message={error} onRetry={retry} />}
    {status === "loading" && books.length > 0 && <p role="status">Загружаем следующую страницу…</p>}
    {hasMore && status === "success" && <div className="pagination"><button type="button" onClick={() => {
      const next = new URLSearchParams(params); next.set("page", String(page + 1)); setParams(next);
    }}>Показать ещё</button></div>}
    {status === "success" && !hasMore && books.length > 0 && <p>Доступные результаты закончились.</p>}
  </section>;
}
