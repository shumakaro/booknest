import { useState, type ReactNode } from "react";

import { AuthContext, type User } from "./AuthContext";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);

  function login() {
    setUser({
      id: "demo-user",
      name: "Тестовый читатель",
    });
  }

  function logout() {
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}