import { useEffect } from "react";

export function useUnsavedChanges(
  enabled: boolean,
): void {
  useEffect(() => {
    function handleBeforeUnload(
      event: BeforeUnloadEvent,
    ) {
      if (!enabled) {
        return;
      }

      event.preventDefault();
    }

    function handleClick(
      event: MouseEvent,
    ) {
      if (!enabled) {
        return;
      }

      const target =
        event.target as HTMLElement;

      const link =
        target.closest("a");

      if (!link) {
        return;
      }

      const href =
        link.getAttribute("href");

      if (
        !href ||
        href.startsWith("#")
      ) {
        return;
      }

      const shouldLeave =
        globalThis.confirm(
          "Есть несохранённые изменения. Покинуть страницу?",
        );

      if (!shouldLeave) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    globalThis.addEventListener(
      "beforeunload",
      handleBeforeUnload,
    );

    document.addEventListener(
      "click",
      handleClick,
      true,
    );

    return () => {
      globalThis.removeEventListener(
        "beforeunload",
        handleBeforeUnload,
      );

      document.removeEventListener(
        "click",
        handleClick,
        true,
      );
    };
  }, [enabled]);
}