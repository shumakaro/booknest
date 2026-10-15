import type { Book } from "../types";

import {
  DataTable,
  type DataTableColumn,
} from "./DataTable";

interface WishlistTableProps {
  books: Book[];
}

// Описываем столбцы отдельно.
// DataTable остаётся универсальным и ничего не знает о Book.
const columns: DataTableColumn<Book>[] = [
  {
    key: "title",
    title: "Название",
    sortable: true,
  },
  {
    key: "authors",
    title: "Автор",
    sortable: true,

    // Для массива авторов задаём своё отображение.
    render: (book) =>
      book.authors.length > 0
        ? book.authors.join(", ")
        : "Не указан",
  },
  {
    key: "year",
    title: "Год",
    sortable: true,

    render: (book) =>
      book.year ?? "—",
  },
];

export function WishlistTable({
  books,
}: WishlistTableProps) {
  if (books.length === 0) {
    return null;
  }

  return (
    <section>
      <h2>Таблица желаемого</h2>

      <DataTable<Book>
        rows={books}
        columns={columns}
        getRowKey={(book) => book.id}
      />
    </section>
  );
}