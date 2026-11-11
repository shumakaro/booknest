// ЛР9/10: состояние берется из личного серверного списка, без localStorage и общего кэша.
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../../app/useAuth";
import { getWishlist, setWishlistSaved } from "../../../api/wishlist";
import { toUserMessage } from "../../../api/client";
import { notify } from "../../../lib/notifications";

export function WishlistAction({ bookId }: { bookId: string }) {
  const { user } = useAuth();
  const authenticated = Boolean(user);
  const location = useLocation();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    if (!authenticated) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError(""); setReady(false);
      try {
        const books = await getWishlist(controller.signal);
        if (!controller.signal.aborted) { setSaved(books.some(book => book.id === bookId)); setReady(true); }
      } catch (reason) { if (!controller.signal.aborted) setError(toUserMessage(reason)); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [authenticated, user?.id, bookId, revision]);

  if (!user) return <Link to="/login" state={{ from: location }}>Войти, чтобы добавить в желаемое</Link>;
  if (loading) return <p role="status">Проверяем желаемое…</p>;
  async function toggle() {
    if (lock.current) return;
    lock.current = true;
    const previous = saved;
    setSaved(!previous); setPending(true); setError("");
    try {
      await setWishlistSaved(bookId, !previous);
      notify(previous ? "Книга удалена из желаемого" : "Книга добавлена в желаемое");
    } catch (reason) { setSaved(previous); setError(toUserMessage(reason) + " Изменение отменено."); }
    finally { lock.current = false; setPending(false); }
  }
  return <section aria-label="Желаемое книги">
    {error && <p role="alert">{error}</p>}
    {/* После ошибки первичного чтения неизвестное состояние не заменяется ложным «не сохранено». */}
    <button type="button" className="btn btn--ghost" aria-pressed={ready ? saved : undefined} disabled={pending}
      onClick={() => { if (!ready) setRevision(value => value + 1); else void toggle(); }}>
      {pending ? "Обновляем желаемое…" : !ready ? "Повторить проверку желаемого" : saved ? "Удалить из желаемого" : "В желаемое"}
    </button>
  </section>;
}
