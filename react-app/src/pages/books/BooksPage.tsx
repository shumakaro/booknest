import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { searchBooks } from "../../api/books";
import { toUserMessage } from "../../api/client";
import { getWishlist, setWishlistSaved } from "../../api/wishlist";
import { useAuth } from "../../app/useAuth";
import { BookList } from "../../components/BookList";
import { ErrorBox } from "../../components/ErrorBox";
import { CatalogSkeleton } from "../../components/CatalogSkeleton";
import { notify } from "../../lib/notifications";
import { useDebounce } from "../../shared/hooks/useDebounce";
import type { Book, RequestStatus } from "../../types";
import { catalogFilters, catalogGenres, catalogSorts } from "../../features/books/catalogFilters";
import "../../features/books/components/CatalogFilters.css";

// Фильтры остаются в URL; сервер выполняет выборку и пагинацию.
export function BooksPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { query, sort, genre, available, page, invalid } = catalogFilters(params);
  const [debounced, setDebounced] = useState(query);
  useDebounce(query, setDebounced, 350);
  const [books, setBooks] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<RequestStatus>("loading");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [wishlist, setWishlist] = useState<Book[]>([]);
  const [wishError, setWishError] = useState("");
  const [saving, setSaving] = useState(false);
  const wishlistIds = useMemo(() => new Set(wishlist.map(book => book.id)), [wishlist]);
  const viewStatus = query !== debounced ? "loading" : status;
  const pages = Math.max(1, Math.ceil(total / 20));
  const restoredLocation = useRef<string | null>(null);

  useEffect(() => {
    if (!invalid) return;
    const next = new URLSearchParams(params);
    next.set("page", String(page)); next.set("sort", sort);
    if (genre) next.set("genre", genre); else next.delete("genre");
    if (!available) next.delete("available");
    setParams(next, { replace: true });
  }, [invalid, page, sort, genre, available, params, setParams]);

  useEffect(() => {
    // При вводе сразу отменяется старый запрос. «Найти» снимает задержку ввода.
    if (query !== debounced) return;
    const controller = new AbortController();
    async function load() {
      setStatus("loading"); setError("");
      try {
        const result = await searchBooks(debounced.trim().replace(/\s+/g, " "), page, controller.signal, { sort, genre, availableOnly: available });
        if (!controller.signal.aborted) { setBooks(result.docs); setTotal(result.total); setStatus(result.docs.length ? "success" : "empty"); }
      } catch (reason) { if (!controller.signal.aborted) { setError(toUserMessage(reason)); setStatus("error"); } }
    }
    void load();
    return () => controller.abort();
  }, [query, debounced, page, sort, genre, available, revision]);

  // После удаления последней книги страницы открывается ближайшая существующая.
  useEffect(() => {
    if ((viewStatus !== "success" && viewStatus !== "empty") || page <= pages) return;
    const next = new URLSearchParams(params); next.set("page", String(pages));
    setParams(next, { replace: true });
  }, [viewStatus, page, pages, params, setParams]);

  useEffect(() => {
    const top: unknown = location.state?.restoreScrollY;
    if (viewStatus !== "success" || typeof top !== "number" || !Number.isFinite(top) || top < 0
      || restoredLocation.current === location.key) return;
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top, behavior: "instant" }); restoredLocation.current = location.key;
    });
    return () => cancelAnimationFrame(frame);
  }, [viewStatus, books.length, location.key, location.state]);

  useEffect(() => {
    let active = true;
    async function load() {
      try { const items = user ? await getWishlist() : []; if (active) setWishlist(items); }
      catch (reason) { if (active) setWishError(toUserMessage(reason)); }
    }
    void load(); return () => { active = false; };
  }, [user]);

  function change(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.set("page", "1");
    // Буквы запроса не создают десятки отдельных записей в истории браузера.
    setParams(next, { replace: key === "q" });
  }

  async function toggleWishlist(book: Book) {
    if (!user) { navigate("/login", { state: { from: location } }); return; }
    if (saving) return;
    const previous = wishlist;
    const saved = !wishlistIds.has(book.id);
    setWishlist(saved ? [...wishlist, book] : wishlist.filter(item => item.id !== book.id));
    setSaving(true); setWishError("");
    try { await setWishlistSaved(book.id, saved); notify(saved ? "Книга добавлена в желаемое" : "Книга удалена из желаемого"); }
    catch (reason) { setWishlist(previous); setWishError(toUserMessage(reason) + " Изменение отменено."); }
    finally { setSaving(false); }
  }

  return <section className="catalog-page"><div className="catalog-intro"><p className="eyebrow">МОЯ БИБЛИОТЕКА</p><h2>Найдите свою<br />следующую историю</h2><p>Книги нашей библиотеки. Другие произведения можно найти в разделе «Глобальный поиск».</p></div>
    <form className="catalog-filters" onSubmit={event => { event.preventDefault(); setDebounced(query); setRevision(value => value + 1); }}>
      <label htmlFor="catalog-query">Поиск по названию или автору</label>
      <input placeholder="Название книги или имя автора" id="catalog-query" value={query}
        aria-describedby="catalog-search-note" onChange={event => change("q", event.target.value)} />
      <button>Найти</button>
      <label htmlFor="catalog-sort">Сортировка</label>
      <select id="catalog-sort" value={sort} onChange={event => change("sort", event.target.value)}>
        {catalogSorts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <label htmlFor="catalog-genre">Жанр</label>
      <select id="catalog-genre" value={genre} onChange={event => change("genre", event.target.value)}>
        <option value="">Все жанры</option>{catalogGenres.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <label><input type="checkbox" checked={available} onChange={event => change("available", event.target.checked ? "1" : "")} /> Только доступные</label>
      {(query || genre || available || sort !== "title") && <button type="button" className="filter-reset" onClick={() => setParams({})}>Сбросить фильтры</button>}
    </form>
    <p id="catalog-search-note" className="catalog-query-note">Поиск выполняется по всей библиотеке, независимо от открытой страницы.</p>
    {(query || genre || available || sort !== "title") && <div className="catalog-active-filters" role="group" aria-label="Активные фильтры">
      {query && <button type="button" aria-label="Сбросить поиск" onClick={() => change("q", "")}>Поиск: {query} <span aria-hidden="true">×</span></button>}
      {genre && <button type="button" aria-label="Убрать фильтр жанра" onClick={() => change("genre", "")}>{catalogGenres.find(([value]) => value === genre)?.[1]} <span aria-hidden="true">×</span></button>}
      {available && <button type="button" aria-label="Убрать фильтр доступности" onClick={() => change("available", "")}>Только доступные <span aria-hidden="true">×</span></button>}
      {sort !== "title" && <button type="button" aria-label="Сбросить сортировку" onClick={() => change("sort", "")}>{catalogSorts.find(([value]) => value === sort)?.[1]} <span aria-hidden="true">×</span></button>}
    </div>}
    {wishError && <p role="alert">{wishError}</p>}
    {viewStatus === "loading" && <CatalogSkeleton />}
    {viewStatus === "error" && <ErrorBox message={error} onRetry={() => setRevision(value => value + 1)} />}
    {(viewStatus === "success" || viewStatus === "empty") && <div className="catalog-result-panel"><p role="status">Найдено: {total}</p>
      <BookList books={books} wishlistIds={wishlistIds} wishlistPending={saving} onWishlistToggle={book => { void toggleWishlist(book); }}
        onDetails={book => navigate(`/books/${encodeURIComponent(book.id)}`, {
          state: { from: location.pathname + location.search, fromScrollY: window.scrollY },
        })} />
      {total === 0 && <p><Link to="/discover">Попробовать глобальный поиск в Open Library</Link></p>}
      <nav className="pagination" aria-label="Страницы каталога">
        <button disabled={page <= 1} onClick={() => change("page", String(page - 1))}>Предыдущая</button>
        <span className="catalog-pagination-position">Страница {page} из {pages}<br />
          {total > 0 ? `Показаны ${(page - 1) * 20 + 1}–${Math.min((page - 1) * 20 + books.length, total)} из ${total}` : "Нет результатов"}</span>
        <button disabled={page * 20 >= total} onClick={() => change("page", String(page + 1))}>Следующая</button>
      </nav></div>}
  </section>;
}
