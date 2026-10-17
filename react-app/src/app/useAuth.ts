import { useContext } from "react";

import { AuthContext, type AuthContextValue } from "./AuthContext";

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth должен использоваться внутри AuthProvider");
  }

  return context;
}