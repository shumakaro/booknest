import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getWishlist, syncWishlist } from "../../api/wishlist";
import { toUserMessage } from "../../api/client";
import { WishlistSection } from "../../components/WishlistSection";
import { Spinner } from "../../components/Spinner";
import { ErrorBox } from "../../components/ErrorBox";
import type { Book } from "../../types";

export function WishlistPage() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() {
      setStatus("loading");
      try { const data = await getWishlist(); if (active) { setBooks(data); setStatus("success"); } }
      catch (reason) { if (active) { setError(toUserMessage(reason)); setStatus("error"); } }
    }
    void load(); return () => { active = false; };
  }, [revision]);
  async function remove(book: Book) {
    if (pending) return;
    const previous = books;
    // Показываем удаление сразу; при неудаче возвращаем точное предыдущее состояние.
    setBooks(books.filter(item => item.id !== book.id)); setPending(true); setError("");
    try { await syncWishlist(book); }
    catch (reason) { setBooks(previous); setError(toUserMessage(reason) + " Изменение отменено."); }
    finally { setPending(false); }
  }
  return <section><h2>Список желаемого</h2>
    {status === "loading" && <Spinner label="Загружаем желаемое..." />}
    {status === "error" && <ErrorBox message={error} onRetry={() => setRevision(value => value + 1)} />}
    {status === "success" && <>{error && <p role="alert">{error}</p>}
      <WishlistSection books={books} onWishlistToggle={book => { void remove(book); }} onDetails={book => navigate(`/books/${book.id}`)} />
    </>}
  </section>;
}
