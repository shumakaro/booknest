import {
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SortDirection = "asc" | "desc";

export interface DataTableColumn<T> {
  key: keyof T;
  title: string;

  // render позволяет отдельно определить,
  // как значение будет показано в таблице.
  render?: (item: T) => ReactNode;

  sortable?: boolean;
}

interface DataTableProps<T extends object> {
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowKey: (item: T) => string;
}

// Универсальная таблица работает с любым типом T.
// Например, мы сможем передать сюда Book.
export function DataTable<T extends object>({
  rows,
  columns,
  getRowKey,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] =
    useState<keyof T | null>(null);

  const [direction, setDirection] =
    useState<SortDirection>("asc");

  // Сортированный массив является производным значением,
  // поэтому не храним отдельную копию в state.
  const sortedRows = useMemo(() => {
    if (sortKey === null) {
      return rows;
    }

    return [...rows].sort((first, second) => {
      const firstValue =
        String(first[sortKey] ?? "");

      const secondValue =
        String(second[sortKey] ?? "");

      const result = firstValue.localeCompare(
        secondValue,
        "ru",
        {
          numeric: true,
        },
      );

      return direction === "asc"
        ? result
        : -result;
    });
  }, [rows, sortKey, direction]);

  function handleSort(key: keyof T) {
    if (sortKey === key) {
      setDirection((current) =>
        current === "asc"
          ? "desc"
          : "asc",
      );

      return;
    }

    setSortKey(key);
    setDirection("asc");
  }

  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)}>
                {column.sortable ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleSort(column.key)
                    }
                  >
                    {column.title}

                    {sortKey === column.key
                      ? direction === "asc"
                        ? " ↑"
                        : " ↓"
                      : ""}
                  </button>
                ) : (
                  column.title
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {sortedRows.map((item) => (
            <tr key={getRowKey(item)}>
              {columns.map((column) => (
                <td key={String(column.key)}>
                  {column.render
                    ? column.render(item)
                    : String(
                        item[column.key] ?? "—",
                      )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}