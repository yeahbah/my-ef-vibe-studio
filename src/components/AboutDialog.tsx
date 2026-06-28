import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { fetchAboutJson } from "../lib/daemonClient";
import {
  STUDIO_COPYRIGHT,
  STUDIO_DESCRIPTION,
  STUDIO_LICENSE,
  STUDIO_LICENSE_SUMMARY,
  STUDIO_LICENSE_URL,
  STUDIO_NAME,
  STUDIO_REPOSITORY,
  STUDIO_VERSION,
} from "../lib/appMeta";
import { useEscapeClose } from "../lib/useEscapeClose";
import type { AboutJsonPayload } from "../types/about";
import type { PrerequisiteCheckResult } from "../types/connection";

interface AboutDialogProps {
  open: boolean;
  searchDirectory: string;
  toolPath: string;
  dotnetFramework: string;
  prerequisites: PrerequisiteCheckResult | undefined;
  prerequisitesLoading: boolean;
  onClose: () => void;
}

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

function AboutLinkValue({ label, url }: { label: string; url: string }) {
  if (!url.trim()) {
    return <dd>{label}</dd>;
  }

  return (
    <dd>
      <button type="button" className="about-link-value" onClick={() => void openExternal(url)}>
        {label}
      </button>
    </dd>
  );
}

export function AboutDialog({
  open,
  searchDirectory,
  toolPath,
  dotnetFramework,
  prerequisites,
  prerequisitesLoading,
  onClose,
}: AboutDialogProps) {
  const [aboutLoading, setAboutLoading] = useState(false);
  const [aboutError, setAboutError] = useState<string>();
  const [about, setAbout] = useState<AboutJsonPayload>();

  useEscapeClose(open, onClose);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setAboutLoading(true);
      setAboutError(undefined);

      try {
        const payload = await fetchAboutJson(
          searchDirectory || ".",
          toolPath,
          dotnetFramework,
        );

        if (!cancelled) {
          setAbout(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setAbout(undefined);
          setAboutError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!cancelled) {
          setAboutLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dotnetFramework, open, searchDirectory, toolPath]);

  if (!open) {
    return null;
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div
        className="settings-panel about-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="about-dialog-title">About</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <section className="about-studio-hero">
          <img src="/icon.png" alt="" className="about-logo" width={72} height={72} />
          <div className="about-studio-copy">
            <p className="about-product-name">
              {STUDIO_NAME} <span className="muted">v{STUDIO_VERSION}</span>
            </p>
            <p className="muted about-studio-description">{STUDIO_DESCRIPTION}</p>
            <dl className="about-details about-studio-meta">
              <div>
                <dt>Copyright</dt>
                <dd>{STUDIO_COPYRIGHT}</dd>
              </div>
              <div>
                <dt>License</dt>
                <dd>
                  <button
                    type="button"
                    className="about-link-value"
                    onClick={() => void openExternal(STUDIO_LICENSE_URL)}
                  >
                    {STUDIO_LICENSE}
                  </button>
                  <p className="muted about-license-summary">{STUDIO_LICENSE_SUMMARY}</p>
                </dd>
              </div>
            </dl>
            <p className="settings-hint">
              <button
                type="button"
                className="about-link-value about-link-inline"
                onClick={() => void openExternal(STUDIO_REPOSITORY)}
              >
                Studio repository
              </button>
            </p>
          </div>
        </section>

        <section>
          <h3>efvibe (:about)</h3>
          {aboutLoading ? <p className="muted">Loading efvibe metadata…</p> : null}
          {aboutError ? <p className="error-text">{aboutError}</p> : null}
          {about ? (
            <dl className="about-details">
              <div>
                <dt>Command</dt>
                <dd>
                  {about.command} <span className="muted">({about.productName})</span>
                </dd>
              </div>
              <div>
                <dt>Version</dt>
                <dd>{about.toolVersion}</dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd className="about-wrap-value">{about.description}</dd>
              </div>
              <div>
                <dt>Author</dt>
                <dd>{about.author}</dd>
              </div>
              <div>
                <dt>License</dt>
                <dd>{about.license}</dd>
              </div>
              <div>
                <dt>Website</dt>
                <AboutLinkValue label={about.website} url={about.website} />
              </div>
              <div>
                <dt>Repository</dt>
                <AboutLinkValue label={about.repository} url={about.repository} />
              </div>
              <div>
                <dt>NuGet</dt>
                <AboutLinkValue label={about.nuGet} url={about.nuGet} />
              </div>
              <div>
                <dt>Runtime</dt>
                <dd className="about-wrap-value">{about.runtime}</dd>
              </div>
            </dl>
          ) : null}
        </section>

        <section>
          <h3>Environment</h3>
          <dl className="about-details">
            <div>
              <dt>.NET SDK</dt>
              <dd>
                {prerequisitesLoading
                  ? "Checking…"
                  : prerequisites?.dotnet.found
                    ? prerequisites.dotnet.version
                    : (prerequisites?.dotnet.error ?? "Not found")}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
