import { useEffect, useRef, useState } from "react";
import { useEscapeClose } from "../lib/useEscapeClose";

interface NewScriptDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (fileName: string) => Promise<void>;
}

const DEFAULT_FILE_NAME = "helpers.csx";

export function NewScriptDialog({ open, onClose, onCreate }: NewScriptDialogProps) {
  const [fileName, setFileName] = useState(DEFAULT_FILE_NAME);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFileName(DEFAULT_FILE_NAME);
    setError(undefined);
    setBusy(false);

    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEscapeClose(open, onClose, !busy);

  if (!open) {
    return null;
  }

  async function handleCreate() {
    const trimmed = fileName.trim();
    if (!trimmed) {
      setError("Script name is required.");
      return;
    }

    setBusy(true);
    setError(undefined);

    try {
      await onCreate(trimmed);
      onClose();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-overlay">
      <div className="settings-panel new-script-dialog" role="dialog" aria-modal="true" aria-labelledby="new-script-dialog-title">
        <header>
          <h2 id="new-script-dialog-title">New script</h2>
          <button type="button" onClick={onClose} disabled={busy}>
            Close
          </button>
        </header>

        <section>
          <label>
            File name
            <input
              ref={inputRef}
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !busy && fileName.trim()) {
                  event.preventDefault();
                  void handleCreate();
                }
              }}
              placeholder="helpers.csx"
              disabled={busy}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <p className="settings-hint">
            Saved in the connection&apos;s script search path. The <code>.csx</code> extension is added
            automatically when omitted.
          </p>
          {error ? <p className="install-pack-error">{error}</p> : null}
          <div className="install-pack-actions">
            <button type="button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="button" disabled={busy || !fileName.trim()} onClick={() => void handleCreate()}>
              {busy ? "Creating…" : "Create"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
