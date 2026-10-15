import type { Theme } from "../types";
import { Badge } from "./Badge";
import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  wishlistCount: number;
  theme: Theme;
  onThemeToggle: () => void;
}

// Верхняя часть сайта.
// Здесь показываем название проекта, количество желаемых книг и тему.
export function Header({
  wishlistCount,
  theme,
  onThemeToggle,
}: HeaderProps) {
  return (
    <header className="site-header">
      <div>
        <h1>BookNest</h1>
        <p>Каталог книг Open Library</p>
      </div>

      <div className="site-header__actions">
        <Badge>
          Желаемое: {wishlistCount}
        </Badge>

        <ThemeToggle
          theme={theme}
          onToggle={onThemeToggle}
        />
      </div>
    </header>
  );
}