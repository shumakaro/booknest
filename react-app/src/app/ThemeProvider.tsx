import { useState, type ReactNode } from "react";

import { loadTheme, saveTheme } from "../lib/storage";
import type { Theme } from "../types";
import { ThemeContext } from "./ThemeContext";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => loadTheme());

  function toggleTheme() {
    setTheme((current) => {
      const next: Theme = current === "light" ? "dark" : "light";

      saveTheme(next);

      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}