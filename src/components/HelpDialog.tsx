import { openUrl } from "@tauri-apps/plugin-opener";
import { resolveKeybindings } from "../lib/keybindings";
import {
  EFVIBE_REPOSITORY,
  STUDIO_REPOSITORY,
} from "../lib/appMeta";
import { useEscapeClose } from "../lib/useEscapeClose";
import type { AppSettings } from "../types/connection";

interface HelpDialogProps {
  open: boolean;
  settings: AppSettings;
  onClose: () => void;
}

async function openExternal(url: string) {
  try {
    await openUrl(url);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function HelpDialog({ open, settings, onClose }: HelpDialogProps) {
  useEscapeClose(open, onClose);

  if (!open) {
    return null;
  }

  const keybindings = resolveKeybindings(settings.keybindings);

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div
        className="settings-panel help-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="help-dialog-title">Help</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <section>
          <h3>Keyboard shortcuts</h3>
          <dl className="help-shortcuts">
            <div>
              <dt>Run all</dt>
              <dd>
                <kbd>{keybindings.runAll}</kbd>
              </dd>
            </div>
            <div>
              <dt>Run current line</dt>
              <dd>
                <kbd>{keybindings.runQuery}</kbd>
              </dd>
            </div>
            <div>
              <dt>Run with plan</dt>
              <dd>
                <kbd>{keybindings.runPlan}</kbd>
              </dd>
            </div>
            <div>
              <dt>Save query</dt>
              <dd>
                <kbd>{keybindings.saveQuery}</kbd>
              </dd>
            </div>
            <div>
              <dt>Toggle explorer</dt>
              <dd>
                <kbd>{keybindings.toggleExplorer}</kbd>
              </dd>
            </div>
            <div>
              <dt>Next query tab</dt>
              <dd>
                <kbd>{keybindings.nextQueryTab}</kbd>
              </dd>
            </div>
            <div>
              <dt>Previous query tab</dt>
              <dd>
                <kbd>{keybindings.previousQueryTab}</kbd>
              </dd>
            </div>
            <div>
              <dt>New query tab</dt>
              <dd>
                <kbd>{keybindings.newQueryTab}</kbd>
              </dd>
            </div>
            <div>
              <dt>Close query tab</dt>
              <dd>
                <kbd>{keybindings.closeQueryTab}</kbd>
              </dd>
            </div>
          </dl>
          <p className="settings-hint">Customize shortcuts in Settings.</p>
        </section>

        <section>
          <h3>Main views</h3>
          <ul className="help-list">
            <li>
              <strong>Query</strong> — run LINQ against your DbContext; Result, SQL, and Plan tabs
              show output.
            </li>
            <li>
              <strong>ER Diagram</strong> — Mermaid entity-relationship view; filter by table from
              the dropdown or explorer context menu.
            </li>
            <li>
              <strong>Notebook</strong> — multi-cell scratchpad saved as <code>.efvibe-notebook</code>
              .
            </li>
            <li>
              <strong>REPL</strong> — interactive efvibe session; type <code>:help</code> for REPL
              commands.
            </li>
          </ul>
        </section>

        <section>
          <h3>Explorer</h3>
          <ul className="help-list">
            <li>Right-click a DbSet for Query, ER Diagram, or Properties.</li>
            <li>Use Scan from the editor tools panel for LINQ performance findings.</li>
            <li>Configure connections and the efvibe tool path in Settings.</li>
          </ul>
        </section>

        <section>
          <h3>Documentation</h3>
          <div className="about-links">
            <button type="button" onClick={() => void openExternal(`${STUDIO_REPOSITORY}/blob/main/docs/USER_GUIDE.md`)}>
              User guide
            </button>
            <button type="button" onClick={() => void openExternal(STUDIO_REPOSITORY)}>
              Studio README
            </button>
            <button type="button" onClick={() => void openExternal(`${EFVIBE_REPOSITORY}/blob/main/features.md`)}>
              efvibe features
            </button>
            <button type="button" onClick={() => void openExternal(`${EFVIBE_REPOSITORY}/blob/main/README.md`)}>
              efvibe CLI README
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
