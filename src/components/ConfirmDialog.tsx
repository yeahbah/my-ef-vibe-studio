interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  detail,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="settings-overlay">
      <div className="settings-panel confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <header>
          <h2 id="confirm-dialog-title">{title}</h2>
        </header>

        <section>
          <p>{message}</p>
          {detail ? (
            <pre className="confirm-dialog-detail">{detail}</pre>
          ) : null}
          <div className="confirm-dialog-actions">
            <button type="button" onClick={onClose}>
              {cancelLabel}
            </button>
            <button type="button" onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
