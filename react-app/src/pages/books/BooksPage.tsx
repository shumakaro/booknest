import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
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

// Фильтры остаются в URL; сервер выполняет выборку и пагинацию.
export function BooksPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const query = params.get("q") ?? "";
  const [debounced, setDebounced] = useState(query);
  useDebounce(query, setDebounced, 350);
  const sort = params.get("sort") ?? "title";
  const genre = params.get("genre") ?? "";
  const available = params.get("available") === "1";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [books, setBooks] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<RequestStatus>("loading");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [wishlist, setWishlist] = useState<Book[]>([]);
  const [wishError, setWishError] = useState("");
  const [saving, setSaving] = useState(false);
  const wishlistIds = useMemo(() => new Set(wishlist.map(book => book.id)), [wishlist]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setStatus("loading"); setError("");
      try {
        const result = await searchBooks(debounced, page, controller.signal, { sort, genre, availableOnly: available });
        if (!controller.signal.aborted) { setBooks(result.docs); setTotal(result.total); setStatus(result.docs.length ? "success" : "empty"); }
      } catch (reason) { if (!controller.signal.aborted) { setError(toUserMessage(reason)); setStatus("error"); } }
    }
    void load();
    return () => controller.abort();
  }, [debounced, page, sort, genre, available, revision]);

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
    setParams(next);
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
    <form className="catalog-filters" onSubmit={event => { event.preventDefault(); setRevision(value => value + 1); }}>
      <label htmlFor="catalog-query">Поиск по названию</label>
      <input placeholder="Какую книгу вы ищете?" id="catalog-query" value={query} onChange={event => change("q", event.target.value)} />
      <button>Найти</button>
      <label htmlFor="catalog-sort">Сортировка</label>
      <select id="catalog-sort" value={sort} onChange={event => change("sort", event.target.value)}>
        <option value="title">Название А–Я</option><option value="-title">Название Я–А</option>
        <option value="year">Сначала старые</option><option value="-year">Сначала новые</option>
      </select>
      <label htmlFor="catalog-genre">Жанр</label>
      <select id="catalog-genre" value={genre} onChange={event => change("genre", event.target.value)}>
        <option value="">Все жанры</option><option value="scifi">Фантастика</option><option value="history">История</option>
        <option value="poetry">Поэзия</option><option value="cs">Информатика</option><option value="fiction">Проза</option>
      </select>
      <label><input type="checkbox" checked={available} onChange={event => change("available", event.target.checked ? "1" : "")} /> Только доступные</label>
      {(query || genre || available || sort !== "title") && <button type="button" className="filter-reset" onClick={() => setParams({})}>Сбросить фильтры</button>}
    </form>
    {wishError && <p role="alert">{wishError}</p>}
    {status === "loading" && <CatalogSkeleton />}
    {status === "error" && <ErrorBox message={error} onRetry={() => setRevision(value => value + 1)} />}
    {(status === "success" || status === "empty") && <><p>Найдено: {total}</p>
      <BookList books={books} wishlistIds={wishlistIds} wishlistPending={saving} onWishlistToggle={book => { void toggleWishlist(book); }}
        onDetails={book => navigate(`/books/${encodeURIComponent(book.id)}`)} />
      <nav className="pagination" aria-label="Страницы каталога">
        <button disabled={page <= 1} onClick={() => change("page", String(page - 1))}>Предыдущая</button>
        <span>Страница {page}</span>
        <button disabled={page * 20 >= total} onClick={() => change("page", String(page + 1))}>Следующая</button>
      </nav></>}
  </section>;
}
