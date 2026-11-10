// Каркас ЛР10/12 повторяет область обложки и действий, не создавая фиктивных книг.
import "../features/books/components/LoadingTransitions.css";

export function CatalogSkeleton({ count = 6, label = "Загружаем каталог" }: { count?: number; label?: string }) {
  return <div className="catalog-skeleton" role="status" aria-label={label} aria-busy="true">
    <span className="visually-hidden">{label}…</span>
    <div className="book-list" aria-hidden="true">{Array.from({ length: count }, (_, index) =>
      <div className="skeleton-card" key={index}><div className="skeleton skeleton-cover" />
        <div className="skeleton-card__body"><div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line skeleton-line--short" /><div className="skeleton skeleton-line" />
          <div className="skeleton-card__actions"><div className="skeleton skeleton-button" /><div className="skeleton skeleton-button" /></div>
        </div></div>)}</div>
  </div>;
}
