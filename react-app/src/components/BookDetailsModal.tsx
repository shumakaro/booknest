import type { BookDetails, RequestStatus } from "../types";

import { ErrorBox } from "./ErrorBox";
import { Modal } from "./Modal";
import { Spinner } from "./Spinner";

interface BookDetailsModalProps {
  open: boolean;
  details: BookDetails | null;
  status: RequestStatus;
  errorMessage: string;
  onClose: () => void;
  onRetry: () => void;
  returnFocusElement?: HTMLElement | null;
}

// Компонент только отображает состояние деталей.
// Сам API-запрос выполняется отдельно.
export function BookDetailsModal({
  open,
  details,
  status,
  errorMessage,
  onClose,
  onRetry,
  returnFocusElement,
}: BookDetailsModalProps) {
  return (
    <Modal
      open={open}
      title={details?.title ?? "Информация о книге"}
      onClose={onClose}
      returnFocusElement={returnFocusElement}
    >
      {status === "loading" && <Spinner label="Загружаем информацию о книге..." />}

      {status === "error" && <ErrorBox message={errorMessage} onRetry={onRetry} />}

      {status === "success" && details && (
        <div className="book-details">
          <p>
            <strong>Авторы:</strong>{" "}
            {details.authors.length > 0 ? details.authors.map((author) => author.name).join(", ") : "Не указаны"}
          </p>

          <h3>Описание</h3>
          <p>{details.description}</p>
        </div>
      )}
    </Modal>
  );
}