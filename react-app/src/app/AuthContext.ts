import { createContext } from "react";

// Поля текущего пользователя получаются от сервера, роль не назначается клиентом.
export interface User { id: number; email: string; role: "member" | "librarian"; name: string; }
export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
export const AuthContext = createContext<AuthContextValue | null>(null);
