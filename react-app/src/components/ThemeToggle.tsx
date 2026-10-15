import type { Theme } from "../types";
import { Button } from "./Button";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export function ThemeToggle({
  theme,
  onToggle,
}: ThemeToggleProps) {
  const nextTheme =
    theme === "light"
      ? "тёмную"
      : "светлую";

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onToggle}
      aria-label={`Переключить на ${nextTheme} тему`}
    >
      {theme === "light"
        ? "Тёмная тема"
        : "Светлая тема"}
    </Button>
  );
}