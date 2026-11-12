// Проверки очередности запросов защищают от поздних 401 и смены личности во время refresh.
import { afterEach, expect, it, vi } from "vitest";
import { apiFetch, refreshAccess, setAccessToken } from "../api/client";
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
function delayed<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
afterEach(() => { vi.unstubAllGlobals(); setAccessToken(null); });
it("параллельные 401 и запоздавший старый 401 используют одну ротацию", async () => {
  setAccessToken("old"); const late = delayed<Response>(); let refreshes = 0; let lateCalls = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
    if (url.endsWith("/auth/refresh")) { refreshes++; return reply({ access_token: "fresh" }); }
    const auth = new Headers(options.headers).get("Authorization");
    if (url.endsWith("/late") && lateCalls++ === 0) return late.promise;
    return auth === "Bearer old" ? reply({}, 401) : reply({ ok: true });
  }));
  const waiting = apiFetch("/late");
  await Promise.all([apiFetch("/one"), apiFetch("/two")]);
  late.resolve(reply({}, 401)); await waiting;
  expect(refreshes).toBe(1);
});
it("старый refresh после выхода не возвращает access в память", async () => {
  setAccessToken("old"); const late = delayed<Response>();
  const fetcher = vi.fn().mockReturnValueOnce(late.promise).mockResolvedValueOnce(reply({ ok: true }));
  vi.stubGlobal("fetch", fetcher);
  const outcome = refreshAccess().catch(error => error);
  setAccessToken(null); late.resolve(reply({ access_token: "stale" }));
  expect(await outcome).toMatchObject({ status: 401 });
  await apiFetch("/books");
  expect(new Headers(fetcher.mock.calls[1]?.[1]?.headers).has("Authorization")).toBe(false);
});
it("запрос старого аккаунта не повторяется от имени нового", async () => {
  setAccessToken("old"); const late = delayed<Response>(); const fetcher = vi.fn().mockReturnValueOnce(late.promise);
  vi.stubGlobal("fetch", fetcher);
  const outcome = apiFetch("/wishlist/7", { method: "DELETE" }).catch(error => error);
  setAccessToken("another-account"); late.resolve(reply({}, 401));
  expect(await outcome).toMatchObject({ status: 401 }); expect(fetcher).toHaveBeenCalledTimes(1);
});
it("не отдает успешный личный ответ старого аккаунта после смены сеанса", async () => {
  setAccessToken("old"); const late = delayed<Response>(); vi.stubGlobal("fetch", vi.fn().mockReturnValue(late.promise));
  const outcome = apiFetch("/wishlist").catch(error => error);
  setAccessToken("another-account"); late.resolve(reply({ items: ["old-private-data"] }));
  expect(await outcome).toMatchObject({ status: 401 });
});
it("ошибка сети при refresh не объявляется завершением сеанса", async () => {
  setAccessToken("old"); const listener = vi.fn(); globalThis.addEventListener("booknest:logout", listener);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(reply({}, 401)).mockRejectedValueOnce(new TypeError("offline")));
  try { await expect(apiFetch("/wishlist")).rejects.toMatchObject({ status: 0 }); expect(listener).not.toHaveBeenCalled(); }
  finally { globalThis.removeEventListener("booknest:logout", listener); }
});
it("повторный 401 завершает сеанс без бесконечного цикла", async () => {
  setAccessToken("old"); const assign = vi.fn();
  vi.stubGlobal("location", { pathname: "/wishlist", search: "?q=book", hash: "#list", assign });
  const fetcher = vi.fn().mockResolvedValueOnce(reply({}, 401)).mockResolvedValueOnce(reply({ access_token: "fresh" })).mockResolvedValueOnce(reply({ message: "Сеанс завершен" }, 401));
  vi.stubGlobal("fetch", fetcher);
  await expect(apiFetch("/wishlist")).rejects.toMatchObject({ status: 401 });
  expect(fetcher).toHaveBeenCalledTimes(3); expect(assign).toHaveBeenCalledWith("/login?returnTo=%2Fwishlist%3Fq%3Dbook%23list&reason=session-expired");
});
it("отмененный запрос не повторяется после общего refresh", async () => {
  setAccessToken("old"); const late = delayed<Response>(); const controller = new AbortController();
  const fetcher = vi.fn().mockResolvedValueOnce(reply({}, 401)).mockReturnValueOnce(late.promise);
  vi.stubGlobal("fetch", fetcher);
  const outcome = apiFetch("/wishlist", { signal: controller.signal }).catch(error => error);
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  controller.abort(); late.resolve(reply({ access_token: "fresh" }));
  expect(await outcome).toMatchObject({ name: "AbortError" }); expect(fetcher).toHaveBeenCalledTimes(2);
});
