import { Button } from "./Button";

interface ErrorBoxProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBox({
  message,
  onRetry,
}: ErrorBoxProps) {
  return (
    <section className="state-box state-box--error" role="alert">
      <h2>Ошибка</h2>

      <p>{message}</p>

      {onRetry && (
        <Button type="button" onClick={onRetry}>
          Повторить
        </Button>
      )}
    </section>
  );
}