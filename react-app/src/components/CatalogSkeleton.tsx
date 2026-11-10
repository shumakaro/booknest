// Каркас повторяет геометрию карточек и не создает фиктивных книг в каталоге.
export function CatalogSkeleton() {
  return <div role="status" aria-label="Загружаем каталог" aria-busy="true">
    <span className="visually-hidden">Загружаем каталог…</span>
    <div className="book-list" aria-hidden="true">{Array.from({ length: 6 }, (_, index) =>
      <div className="skeleton-card" key={index}><div className="skeleton skeleton-cover" />
        <div className="skeleton skeleton-line" /><div className="skeleton skeleton-line skeleton-line--short" />
        <div className="skeleton skeleton-line" /></div>)}</div>
  </div>;
}
