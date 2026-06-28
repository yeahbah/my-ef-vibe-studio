import { useEffect } from "react";

export function handleEscapeCloseKeyDown(
  event: KeyboardEvent,
  onClose: () => void,
): void {
  if (event.key !== "Escape") {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  onClose();
}

export function useEscapeClose(
  open: boolean,
  onClose: () => void,
  enabled = true,
): void {
  useEffect(() => {
    if (!open || !enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      handleEscapeCloseKeyDown(event, onClose);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [open, enabled, onClose]);
}
