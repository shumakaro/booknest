import { useEffect, useState, type ReactNode } from "react";
import { apiFetch, refreshAccess, setAccessToken } from "../api/client";
import { AuthContext, type User } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      try {
        await refreshAccess();
        const current = await apiFetch<User>("/auth/me");
        if (active) setUser({ ...current, name: current.email });
      } catch { if (active) setUser(null); }
      finally { if (active) setLoading(false); }
    }
    void restoreSession();
    const clearSession = () => setUser(null);
    globalThis.addEventListener("booknest:logout", clearSession);
    return () => { active = false; globalThis.removeEventListener("booknest:logout", clearSession); };
  }, []);

  async function login(email: string, password: string) {
    const form = new URLSearchParams({ username: email, password });
    const tokens = await apiFetch<{ access_token: string }>("/auth/token", { method: "POST", body: form });
    setAccessToken(tokens.access_token);
    const current = await apiFetch<User>("/auth/me");
    setUser({ ...current, name: current.email });
  }

  async function logout() {
    try { await apiFetch<void>("/auth/logout", { method: "POST" }); }
    finally { setAccessToken(null); setUser(null); }
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}
