// ЛР10: личный список остается серверным; поиск и сортировка работают по всем загруженным страницам.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { getWishlist, syncWishlist } from "../../api/wishlist";
import { toUserMessage } from "../../api/client";
import { BookList } from "../../components/BookList";
import { WishlistTable } from "../../components/WishlistTable";
import { CatalogSkeleton } from "../../components/CatalogSkeleton";
import { EmptyState } from "../../components/EmptyState";
import { ErrorBox } from "../../components/ErrorBox";
import { notify } from "../../lib/notifications";
import type { Book, RequestStatus } from "../../types";
import "../../features/books/components/Wishlist.css";

const collator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });
const sorts = [["title", "По названию"], ["author", "По автору"], ["-year", "Сначала новые"], ["year", "Сначала старые"]];
export function WishlistPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const sort = sorts.some(([value]) => value === params.get("sort")) ? params.get("sort")! : "title";
  const available = params.get("available") === "1";
  const [books, setBooks] = useState<Book[]>([]);
  const [status, setStatus] = useState<RequestStatus>("loading");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const restored = useRef<string | null>(null);
  const ids = useMemo(() => new Set(books.map(book => book.id)), [books]);
  const visible = useMemo(() => {
    const term = query.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru");
    return books.filter(book => (!term || `${book.title} ${book.authors.join(" ")}`.toLocaleLowerCase("ru").includes(term))
      && (!available || (book.record?.available ?? 0) > 0)).sort((a, b) => {
        let result: number;
        if (sort === "author") result = collator.compare(a.authors.join(", "), b.authors.join(", "));
        else if (sort === "year" || sort === "-year") {
          // Неизвестный год остается в конце при обоих направлениях сортировки.
          if (a.year === undefined) return b.year === undefined ? collator.compare(a.id, b.id) : 1;
          if (b.year === undefined) return -1;
          result = sort === "year" ? a.year - b.year : b.year - a.year;
        } else result = collator.compare(a.title, b.title);
        return result || collator.compare(a.id, b.id);
      });
  }, [books, query, sort, available]);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setStatus("loading"); setError("");
      try { const data = await getWishlist(controller.signal); if (!controller.signal.aborted) { setBooks(data); setStatus("success"); } }
      catch (reason) { if (!controller.signal.aborted) { setError(toUserMessage(reason)); setStatus("error"); } }
    }
    void load(); return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    const top: unknown = location.state?.restoreScrollY;
    if (status !== "success" || typeof top !== "number" || !Number.isFinite(top) || top < 0 || restored.current === location.key) return;
    const frame = requestAnimationFrame(() => { window.scrollTo({ top, behavior: "instant" }); restored.current = location.key; });
    return () => cancelAnimationFrame(frame);
  }, [status, visible.length, location.key, location.state]);
  function change(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: key === "q" });
  }
  async function remove(book: Book) {
    if (lock.current) return;
    lock.current = true;
    const previous = books;
    setBooks(current => current.filter(item => item.id !== book.id)); setPending(true); setActionError("");
    try { await syncWishlist(book); notify("Книга удалена из желаемого"); }
    catch (reason) { setBooks(previous); setActionError(toUserMessage(reason) + " Изменение отменено."); }
    finally { lock.current = false; setPending(false); }
  }
  return <section><h2>Список желаемого</h2>
    <p className="wishlist-intro">Ваши сохраненные книги. Желаемое не резервирует экземпляр; актуальное наличие показано на карточке.</p>
    {status === "loading" && <CatalogSkeleton label="Загружаем желаемое" />}
    {status === "error" && <ErrorBox message={error} onRetry={() => setRevision(value => value + 1)} />}
    {status === "success" && <>
      {actionError && <p role="alert">{actionError}</p>}
      {pending && <p role="status">Обновляем желаемое…</p>}
      {books.length === 0 ? pending ? null : <><EmptyState title="Список желаемого пуст" message="Сохраните понравившиеся книги из моей библиотеки." /><Link to="/books">Выбрать книги в библиотеке</Link></> : <>
        <form className="wishlist-tools" onSubmit={event => event.preventDefault()}>
          <label>Поиск в желаемом<input type="search" value={query} placeholder="Название или автор" onChange={event => change("q", event.target.value)} /></label>
          <label>Сортировка желаемого<select value={sort} onChange={event => change("sort", event.target.value)}>{sorts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="wishlist-available"><input type="checkbox" checked={available} onChange={event => change("available", event.target.checked ? "1" : "")} /> Только доступные</label>
          {(query || available || sort !== "title") && <button type="button" onClick={() => setParams({})}>Сбросить условия</button>}
        </form>
        <p role="status">В желаемом: {books.length}. Показано: {visible.length}.</p>
        {visible.length === 0 ? <EmptyState title="В желаемом нет совпадений" message="Измените запрос или сбросьте условия; сохраненные книги остаются в списке." /> : <>
          <BookList books={visible} wishlistIds={ids} wishlistPending={pending}
            onWishlistToggle={book => { void remove(book); }} onDetails={book => navigate(`/books/${book.id}`, { state: { from: location.pathname + location.search, fromScrollY: window.scrollY } })} />
          <details className="wishlist-table"><summary>Показать таблицу желаемого</summary><WishlistTable books={visible} /></details>
        </>}
      </>}
    </>}
  </section>;
}
