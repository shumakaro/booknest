import { useEffect, useRef, useState, type ReactNode } from "react";
import { apiFetch, refreshAccess, setAccessToken } from "../api/client";
import { AuthContext, type User } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Запоздавшее восстановление/чтение пользователя не заменяет новый вход или выход.
  const operation = useRef(0);

  useEffect(() => {
    let active = true;
    const version = ++operation.current;
    async function restoreSession() {
      try {
        await refreshAccess();
        const current = await apiFetch<User>("/auth/me");
        if (active && version === operation.current) setUser({ ...current, name: current.email });
      } catch { if (active && version === operation.current) { setAccessToken(null); setUser(null); } }
      finally { if (active && version === operation.current) setLoading(false); }
    }
    void restoreSession();
    const clearSession = () => { operation.current += 1; setUser(null); setLoading(false); };
    globalThis.addEventListener("booknest:logout", clearSession);
    return () => { active = false; globalThis.removeEventListener("booknest:logout", clearSession); };
  }, []);

  async function login(email: string, password: string) {
    const version = ++operation.current;
    setAccessToken(null);
    const form = new URLSearchParams({ username: email, password });
    try {
      const tokens = await apiFetch<{ access_token: string }>("/auth/token", { method: "POST", body: form });
      if (version !== operation.current) throw new Error("Сеанс изменился");
      setAccessToken(tokens.access_token);
      const current = await apiFetch<User>("/auth/me");
      if (version !== operation.current) throw new Error("Сеанс изменился");
      setUser({ ...current, name: current.email });
    } catch (reason) {
      if (version === operation.current) { setAccessToken(null); setUser(null); }
      throw reason;
    } finally { if (version === operation.current) setLoading(false); }
  }

  async function logout() {
    const version = ++operation.current;
    // Заголовок старого access создается до очистки; cookie отзывает сервер.
    const request = apiFetch<void>("/auth/logout", { method: "POST" });
    setAccessToken(null);
    try { await request; if (version === operation.current) setUser(null); }
    finally { if (version === operation.current) setLoading(false); }
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}
