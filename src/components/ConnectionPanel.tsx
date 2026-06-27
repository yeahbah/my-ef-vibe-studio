import { useEffect, useState } from "react";
import { getVaultedConnectionString } from "../lib/connectionVault";
import type { WorkspaceConnection } from "../types/workspace";
import { PathInput } from "./PathInput";

interface ConnectionPanelProps {
  open: boolean;
  connection: WorkspaceConnection;
  workspacePath: string;
  vaultConnectionSecrets: boolean;
  onClose: () => void;
  onConnectionChange: (connection: WorkspaceConnection) => void;
}

export function ConnectionPanel({
  open,
  connection,
  workspacePath,
  vaultConnectionSecrets,
  onClose,
  onConnectionChange,
}: ConnectionPanelProps) {
  const [vaultStored, setVaultStored] = useState(false);

  useEffect(() => {
    if (!open || !vaultConnectionSecrets) {
      setVaultStored(false);
      return;
    }

    void (async () => {
      const vaulted = await getVaultedConnectionString(workspacePath, connection.id);
      setVaultStored(Boolean(vaulted?.trim()));
    })();
  }, [open, vaultConnectionSecrets, workspacePath, connection.id, connection.connectionString]);

  if (!open) {
    return null;
  }

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <header>
          <h2>Connection</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <section>
          <label>
            Name
            <input
              value={connection.name}
              onChange={(event) => onConnectionChange({ ...connection, name: event.target.value })}
            />
          </label>
          <label>
            Search directory
            <PathInput
              kind="folder"
              value={connection.searchDirectory ?? ""}
              onChange={(searchDirectory) =>
                onConnectionChange({ ...connection, searchDirectory })
              }
              placeholder="Folder with your solution (efvibe discovers .csproj here)"
            />
          </label>
          <label>
            EF project (-p, optional)
            <PathInput
              kind="csproj"
              value={connection.efProject}
              onChange={(efProject) => onConnectionChange({ ...connection, efProject })}
              placeholder="Leave empty to auto-discover from search directory"
            />
          </label>
          <label>
            Startup project (-s)
            <PathInput
              kind="csproj"
              value={connection.startupProject ?? ""}
              onChange={(startupProject) =>
                onConnectionChange({ ...connection, startupProject })
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
            {vaultConnectionSecrets ? (
              <span className="settings-hint">
                {vaultStored
                  ? "Stored in the local vault for this workspace."
                  : "Will be stored in the vault when saved."}
              </span>
            ) : null}
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

        <section>
          <h3>Script session</h3>
          <p className="settings-hint">
            Optional helpers loaded into every query for this connection. Use <code>#load</code>{" "}
            in a query tab for one-off files.
          </p>
          <label>
            Script search path
            <PathInput
              kind="folder"
              value={connection.scriptSearchPath ?? ""}
              onChange={(scriptSearchPath) =>
                onConnectionChange({ ...connection, scriptSearchPath })
              }
              placeholder="Defaults to search directory"
            />
          </label>
          <label>
            Script loads (one path per line)
            <textarea
              rows={4}
              value={(connection.scriptLoads ?? []).join("\n")}
              onChange={(event) =>
                onConnectionChange({
                  ...connection,
                  scriptLoads: splitMultilineList(event.target.value),
                })
              }
              placeholder={"scripts/helpers.csx\nshared/query-filters.csx"}
            />
          </label>
          <label>
            Additional usings (one namespace per line)
            <textarea
              rows={3}
              value={(connection.scriptUsings ?? []).join("\n")}
              onChange={(event) =>
                onConnectionChange({
                  ...connection,
                  scriptUsings: splitMultilineList(event.target.value),
                })
              }
              placeholder={"MyApp.QueryHelpers\nSystem.Globalization"}
            />
          </label>
        </section>
      </div>
    </div>
  );
}

function splitMultilineList(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
