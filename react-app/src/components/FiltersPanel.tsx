import type { ChangeEvent } from "react";
import type { SortOption } from "../types";

interface FiltersPanelProps {
  sort: SortOption;
  onlyWithCover: boolean;
  onSortChange: (value: SortOption) => void;
  onCoverChange: (value: boolean) => void;
}

export function FiltersPanel({
  sort,
  onlyWithCover,
  onSortChange,
  onCoverChange,
}: FiltersPanelProps) {
  function handleSortChange(
    event: ChangeEvent<HTMLSelectElement>,
  ) {
    onSortChange(
      event.target.value as SortOption,
    );
  }

  function handleCoverChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    onCoverChange(event.target.checked);
  }

  return (
    <section className="filters-panel">
      <div>
        <label htmlFor="sort">
          Сортировка
        </label>

        <select
          id="sort"
          value={sort}
          onChange={handleSortChange}
        >
          <option value="relevance">
            По релевантности
          </option>

          <option value="title-asc">
            Название: А–Я
          </option>

          <option value="title-desc">
            Название: Я–А
          </option>

          <option value="year-asc">
            Год: сначала старые
          </option>

          <option value="year-desc">
            Год: сначала новые
          </option>
        </select>
      </div>

      <label>
        <input
          type="checkbox"
          checked={onlyWithCover}
          onChange={handleCoverChange}
        />

        Только с обложкой
      </label>
    </section>
  );
}