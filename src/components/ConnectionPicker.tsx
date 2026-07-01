import type { WorkspaceConnection } from "../types/workspace";
import { connectionDisplayName } from "../types/workspace";

interface ConnectionPickerProps {
  connections: WorkspaceConnection[];
  activeConnectionId: string;
  onChange: (connectionId: string) => void;
  ariaLabel?: string;
}

export function ConnectionPicker({
  connections,
  activeConnectionId,
  onChange,
  ariaLabel = "Connection for this query",
}: ConnectionPickerProps) {
  return (
    <label className="connection-picker">
      <select
        value={activeConnectionId}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
      >
        {connections.map((connection) => (
          <option key={connection.id} value={connection.id}>
            {connectionDisplayName(connection)}
          </option>
        ))}
      </select>
    </label>
  );
}
