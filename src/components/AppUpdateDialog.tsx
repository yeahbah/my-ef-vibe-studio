import { useCallback, useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { checkAppUpdate, downloadAndInstallAppUpdate } from "../lib/appUpdate";
import { STUDIO_REPOSITORY } from "../lib/appMeta";
import { useEscapeClose } from "../lib/useEscapeClose";
import type { AppUpdateCheckResult } from "../types/appUpdate";

interface AppUpdateDialogProps {
  open: boolean;
  onClose: () => void;
}

type DialogPhase = "checking" | "ready" | "downloading" | "done" | "error";

async function openExternal(url: string) {
  if (!url.trim()) {
    return;
  }

  try {
    await openUrl(url);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function AppUpdateDialog({ open, onClose }: AppUpdateDialogProps) {
  const [phase, setPhase] = useState<DialogPhase>("checking");
  const [result, setResult] = useState<AppUpdateCheckResult | undefined>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const busy = phase === "checking" || phase === "downloading";

  useEscapeClose(open, onClose, !busy);

  const runCheck = useCallback(async () => {
    setPhase("checking");
    setError(undefined);
    setMessage(undefined);

    try {
      const checkResult = await checkAppUpdate();
      setResult(checkResult);

      if (checkResult.error) {
        setPhase("error");
        setError(checkResult.error);
        return;
      }

      setPhase("ready");
    } catch (checkError) {
      setResult(undefined);
      setPhase("error");
      setError(checkError instanceof Error ? checkError.message : String(checkError));
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    void runCheck();
  }, [open, runCheck]);

  async function handleDownload() {
    if (!result?.downloadUrl || !result.downloadName) {
      setError("No installer is available for this platform.");
      setPhase("error");
      return;
    }

    setPhase("downloading");
    setError(undefined);
    setMessage(undefined);

    try {
      const installMessage = await downloadAndInstallAppUpdate(
        result.downloadUrl,
        result.downloadName,
      );
      setMessage(installMessage);
      setPhase("done");
    } catch (installError) {
      setPhase("error");
      setError(installError instanceof Error ? installError.message : String(installError));
    }
  }

  if (!open) {
    return null;
  }

  const releaseUrl = result?.releaseUrl ?? `${STUDIO_REPOSITORY}/releases/latest`;

  return (
    <div className="settings-overlay" onClick={busy ? undefined : onClose}>
      <div
        className="settings-panel app-update-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-update-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="app-update-dialog-title">Check for updates</h2>
          <button type="button" onClick={onClose} disabled={busy}>
            Close
          </button>
        </header>

        <section>
          {phase === "checking" ? <p className="muted">Checking GitHub Releases…</p> : null}

          {result ? (
            <dl className="about-details app-update-details">
              <div>
                <dt>Installed</dt>
                <dd>v{result.currentVersion}</dd>
              </div>
              <div>
                <dt>Latest</dt>
                <dd>{result.latestVersion ? `v${result.latestVersion}` : "Unknown"}</dd>
              </div>
            </dl>
          ) : null}

          {phase === "ready" && result && !result.updateAvailable ? (
            <p>MyEFvibe Studio is up to date.</p>
          ) : null}

          {phase === "ready" && result?.updateAvailable ? (
            <>
              <p>
                Version <strong>v{result.latestVersion}</strong> is available.
              </p>
              {result.releaseNotes ? (
                <pre className="app-update-notes">{result.releaseNotes}</pre>
              ) : null}
              {result.downloadName ? (
                <p className="settings-hint">
                  Installer: <code>{result.downloadName}</code>
                </p>
              ) : null}
            </>
          ) : null}

          {phase === "downloading" ? <p className="muted">Downloading and starting the installer…</p> : null}

          {message ? <p className="app-update-success">{message}</p> : null}
          {error ? <p className="error-text">{error}</p> : null}

          <div className="app-update-actions">
            {phase === "ready" && result?.updateAvailable ? (
              <button type="button" className="primary" onClick={() => void handleDownload()}>
                Download and install
              </button>
            ) : null}
            <button type="button" disabled={busy} onClick={() => void runCheck()}>
              Check again
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => void openExternal(releaseUrl)}
            >
              Open release page
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
