import type { AppSettings } from "../types/connection";
import type { WorkspaceConnection } from "../types/workspace";

interface SettingsPanelProps {
  open: boolean;
  settings: AppSettings;
  connection: WorkspaceConnection;
  onClose: () => void;
  onSettingsChange: (settings: AppSettings) => void;
  onConnectionChange: (connection: WorkspaceConnection) => void;
}

export function SettingsPanel({
  open,
  settings,
  connection,
  onClose,
  onSettingsChange,
  onConnectionChange,
}: SettingsPanelProps) {
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
            <input
              value={settings.defaultWorkspaceRoot}
              onChange={(event) =>
                onSettingsChange({ ...settings, defaultWorkspaceRoot: event.target.value })
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
        </section>

        <section>
          <h3>Active connection</h3>
          <label>
            Name
            <input
              value={connection.name}
              onChange={(event) => onConnectionChange({ ...connection, name: event.target.value })}
            />
          </label>
          <label>
            Search directory
            <input
              value={connection.searchDirectory ?? ""}
              onChange={(event) =>
                onConnectionChange({ ...connection, searchDirectory: event.target.value })
              }
              placeholder="Folder with your solution (efvibe discovers .csproj here)"
            />
          </label>
          <label>
            EF project (-p, optional)
            <input
              value={connection.efProject}
              onChange={(event) =>
                onConnectionChange({ ...connection, efProject: event.target.value })
              }
              placeholder="Leave empty to auto-discover from search directory"
            />
          </label>
          <label>
            Startup project (-s)
            <input
              value={connection.startupProject ?? ""}
              onChange={(event) =>
                onConnectionChange({ ...connection, startupProject: event.target.value })
              }
              placeholder="path/to/API.csproj"
            />
          </label>
          <label>
            DbContext (-c, optional)
            <input
              value={connection.context}
              onChange={(event) =>
                onConnectionChange({ ...connection, context: event.target.value })
              }
              placeholder="Leave empty to auto-discover"
            />
          </label>
          <label>
            Connection string override
            <input
              value={connection.connectionString ?? ""}
              onChange={(event) =>
                onConnectionChange({ ...connection, connectionString: event.target.value })
              }
              placeholder="Optional --connection-string"
            />
          </label>
          <label>
            .NET framework
            <input
              value={connection.dotnetFramework ?? ""}
              onChange={(event) =>
                onConnectionChange({ ...connection, dotnetFramework: event.target.value })
              }
              placeholder="net10.0"
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={connection.dbLog ?? true}
              onChange={(event) =>
                onConnectionChange({ ...connection, dbLog: event.target.checked })
              }
            />
            Show SQL in daemon logs
          </label>
        </section>
      </div>
    </div>
  );
}
