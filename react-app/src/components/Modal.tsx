import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  returnFocusElement?: HTMLElement | null;
}

// Универсальное модальное окно.
// children позволяет передавать внутрь любое содержимое.
export function Modal({ open, title, children, onClose, returnFocusElement }: ModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    // После открытия переводим фокус на кнопку закрытия.
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    globalThis.addEventListener("keydown", handleKeyDown);

    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);

      // После закрытия возвращаем фокус на кнопку,
      // с которой пользователь открыл модальное окно.
      returnFocusElement?.focus();
    };
  }, [open, onClose, returnFocusElement]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal__header">
          <h2 id="modal-title">{title}</h2>

          <button ref={closeButtonRef} type="button" className="modal__close" onClick={onClose} aria-label="Закрыть окно">
            ×
          </button>
        </div>

        <div className="modal__body">{children}</div>
      </section>
    </div>
  );
}