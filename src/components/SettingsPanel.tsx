import type { AppSettings } from "../types/connection";
import { keybindingLabel } from "../lib/keybindings";
import { DEFAULT_KEYBINDINGS } from "../types/keybindings";
import { PathInput } from "./PathInput";

interface SettingsPanelProps {
  open: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSettingsChange: (settings: AppSettings) => void;
}

export function SettingsPanel({
  open,
  settings,
  onClose,
  onSettingsChange,
}: SettingsPanelProps) {
  const keybindings = {
    ...DEFAULT_KEYBINDINGS,
    ...(settings.keybindings ?? {}),
  };

  if (!open) {
    return null;
  }

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <header>
          <h2>Settings</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <section>
          <h3>Application</h3>
          <label>
            efvibe tool path (optional)
            <input
              value={settings.toolPath}
              onChange={(event) =>
                onSettingsChange({ ...settings, toolPath: event.target.value })
              }
              placeholder="Leave empty to use dotnet-tools.json or PATH"
            />
          </label>
          <label>
            Default workspace root
            <PathInput
              kind="folder"
              value={settings.defaultWorkspaceRoot}
              onChange={(defaultWorkspaceRoot) =>
                onSettingsChange({ ...settings, defaultWorkspaceRoot })
              }
              placeholder="~/.efvibe"
            />
          </label>
          <label>
            Open in IDE
            <select
              value={settings.preferredEditor}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  preferredEditor: event.target.value as AppSettings["preferredEditor"],
                })
              }
            >
              <option value="code">VS Code</option>
              <option value="rider">Rider</option>
              <option value="devenv">Visual Studio</option>
              <option value="custom">Custom command</option>
            </select>
          </label>
          {settings.preferredEditor === "custom" && (
            <label>
              Custom editor command
              <input
                value={settings.customEditorCommand}
                onChange={(event) =>
                  onSettingsChange({ ...settings, customEditorCommand: event.target.value })
                }
                placeholder="my-editor"
              />
            </label>
          )}
          <label>
            Team sync directory
            <PathInput
              kind="folder"
              value={settings.teamSyncDirectory}
              onChange={(teamSyncDirectory) =>
                onSettingsChange({ ...settings, teamSyncDirectory })
              }
              placeholder="Shared folder for team query packs (optional)"
            />
          </label>
          <label>
            Cloud sync directory
            <PathInput
              kind="folder"
              value={settings.cloudSyncDirectory ?? ""}
              onChange={(cloudSyncDirectory) =>
                onSettingsChange({ ...settings, cloudSyncDirectory })
              }
              placeholder="Dropbox / iCloud / OneDrive folder for queries (optional)"
            />
          </label>
          <p className="settings-hint">
            Cloud sync writes favorite queries as <code>.efvibe-query</code> files and a pack manifest.
            Connection strings are never synced.
          </p>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={settings.vaultConnectionSecrets ?? true}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  vaultConnectionSecrets: event.target.checked,
                })
              }
            />
            Store connection strings in the local secret vault (not in workspace files)
          </label>
        </section>

        <section>
          <h3>Keybindings</h3>
          <label>
            Run query
            <input
              value={keybindings.runQuery}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  keybindings: { ...settings.keybindings, runQuery: event.target.value },
                })
              }
              placeholder={DEFAULT_KEYBINDINGS.runQuery}
            />
          </label>
          <label>
            Run plan
            <input
              value={keybindings.runPlan}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  keybindings: { ...settings.keybindings, runPlan: event.target.value },
                })
              }
              placeholder={DEFAULT_KEYBINDINGS.runPlan}
            />
          </label>
          <label>
            Toggle explorer
            <input
              value={keybindings.toggleExplorer}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  keybindings: { ...settings.keybindings, toggleExplorer: event.target.value },
                })
              }
              placeholder={DEFAULT_KEYBINDINGS.toggleExplorer}
            />
          </label>
          <label>
            Save query
            <input
              value={keybindings.saveQuery}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  keybindings: { ...settings.keybindings, saveQuery: event.target.value },
                })
              }
              placeholder={DEFAULT_KEYBINDINGS.saveQuery}
            />
          </label>
          <p className="settings-hint">
            Use <code>Ctrl</code> or <code>Cmd</code> with <code>+</code> (for example{" "}
            {keybindingLabel(DEFAULT_KEYBINDINGS.runQuery)}).
          </p>
        </section>
      </div>
    </div>
  );
}
