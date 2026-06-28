import { useState } from "react";
import { useEscapeClose } from "../lib/useEscapeClose";

interface InstallPackUrlDialogProps {
  open: boolean;
  onClose: () => void;
  onInstall: (url: string) => Promise<void>;
}

export function InstallPackUrlDialog({ open, onClose, onInstall }: InstallPackUrlDialogProps) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEscapeClose(open, onClose, !busy);

  if (!open) {
    return null;
  }

  async function handleInstall() {
    setBusy(true);
    setError(undefined);

    try {
      await onInstall(url.trim());
      setUrl("");
      onClose();
    } catch (installError) {
      setError(installError instanceof Error ? installError.message : String(installError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-overlay">
      <div className="settings-panel install-pack-dialog">
        <header>
          <h2>Install pack from URL</h2>
          <button type="button" onClick={onClose} disabled={busy}>
            Close
          </button>
        </header>

        <section>
          <label>
            Pack URL
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/my-pack.efvibe-pack"
              disabled={busy}
            />
          </label>
          <p className="settings-hint">
            Paste a direct link to a <code>.efvibe-pack</code> JSON file (for example a GitHub raw URL).
          </p>
          {error ? <p className="install-pack-error">{error}</p> : null}
          <div className="install-pack-actions">
            <button type="button" disabled={busy || !url.trim()} onClick={() => void handleInstall()}>
              {busy ? "Installing…" : "Install"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
