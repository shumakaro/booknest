interface SpinnerProps {
  label?: string;
}

export function Spinner({ label = "Загрузка..." }: SpinnerProps) {
  return (
    <div className="spinner" role="status" aria-live="polite">
      <span className="spinner__circle" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}