import { Button } from "./Button";

interface LoadMoreButtonProps {
  visible: boolean;
  loading: boolean;
  onClick: () => void;
}

// Кнопка используется для загрузки следующей страницы API.
// Новые книги добавляются к уже показанным.
export function LoadMoreButton({
  visible,
  loading,
  onClick,
}: LoadMoreButtonProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="load-more">
      <Button
        type="button"
        onClick={onClick}
        disabled={loading}
      >
        {loading
          ? "Загрузка..."
          : "Показать ещё"}
      </Button>
    </div>
  );
}