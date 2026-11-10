// Накопление соседних страниц без дублей; новый запрос полностью отделен от старого.
import { useEffect, useState } from "react";
import { searchGlobalBooks } from "../../../api/discover";
import type { ExternalBook } from "../../../api/discover";
import { toUserMessage } from "../../../api/client";
import type { RequestStatus } from "../../../types";

interface SearchSnapshot {
  key: string; items: ExternalBook[]; total: number; page: number; hasMore: boolean;
}
// Короткая память последних страниц возвращает накопленный список после просмотра деталей.
// Это публичные данные в памяти вкладки, без localStorage и без пользовательских токенов.
const snapshots = new Map<string, { expires: number; result: SearchSnapshot }>();
export function clearGlobalSearchCache() { snapshots.clear(); }

export function useGlobalBooks(title: string, author: string, page: number) {
  const key = JSON.stringify([title, author]);
  const [result, setResult] = useState({ key: "", items: [] as ExternalBook[], total: 0, page: 0, hasMore: false });
  const [state, setState] = useState<{ key: string; page: number; status: RequestStatus; error: string }>({
    key: "", page: 0, status: "idle", error: "",
  });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!title && !author) return;
    const controller = new AbortController();
    async function load() {
      setState({ key, page, status: "loading", error: "" });
      try {
        const cacheKey = JSON.stringify([title, author, page]);
        const snapshot = snapshots.get(cacheKey);
        if (revision === 0 && snapshot && snapshot.expires > Date.now()) {
          setResult(snapshot.result);
          setState({ key, page, status: snapshot.result.total ? "success" : "empty", error: "" });
          return;
        }
        const data = await searchGlobalBooks(title, author, page, controller.signal);
        if (controller.signal.aborted) return;
        setResult(previous => {
          const accumulated = previous.key === key && previous.page + 1 === page
            ? [...previous.items, ...data.items] : data.items;
          const unique = [...new Map(accumulated.map(book => [book.id, book])).values()];
          return { key, items: unique, total: data.total, page, hasMore: data.has_more };
        });
        setState({ key, page, status: data.total ? "success" : "empty", error: "" });
      } catch (error) {
        if (!controller.signal.aborted) setState({ key, page, status: "error", error: toUserMessage(error) });
      }
    }
    void load();
    // Отмена и проверка signal защищают от запоздавшего результата предыдущего поиска.
    return () => controller.abort();
  }, [title, author, page, key, revision]);

  useEffect(() => {
    if (result.page === page && result.key === key && state.status === "success") {
      const cacheKey = JSON.stringify([title, author, page]);
      snapshots.delete(cacheKey);
      snapshots.set(cacheKey, { expires: Date.now() + 60_000, result });
      while (snapshots.size > 5) snapshots.delete(snapshots.keys().next().value!);
    }
  }, [result, state.status, title, author, page, key]);

  const active = Boolean(title || author);
  const current = result.key === key;
  const status = !active ? "idle" : state.key === key && state.page === page ? state.status : "loading";
  return { books: current && active ? result.items : [], total: current ? result.total : 0,
    hasMore: current && result.hasMore && page < 1000, status,
    error: state.key === key ? state.error : "", retry: () => setRevision(value => value + 1) };
}
