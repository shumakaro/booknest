import type { ChangeEvent, FormEvent } from "react";
import { Button } from "./Button";
import { Spinner } from "./Spinner";

interface SearchPanelProps {
  query: string;
  loading: boolean;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
}

export function SearchPanel({
  query,
  loading,
  onQueryChange,
  onSubmit,
}: SearchPanelProps) {
  function handleChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    onQueryChange(event.target.value);
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form
      className="search-panel"
      onSubmit={handleSubmit}
    >
      <label htmlFor="book-search">
        Поиск книг
      </label>

      <div className="search-panel__row">
        <input
          id="book-search"
          type="search"
          value={query}
          onChange={handleChange}
          placeholder="Например: Tolkien"
          minLength={2}
        />

        <Button
          type="submit"
          disabled={loading || query.trim().length < 2}
        >
          Найти
        </Button>
      </div>

      {loading && (
        <Spinner label="Ищем книги..." />
      )}
    </form>
  );
}