import type { WorkspaceConnection } from "../types/workspace";
import { connectionDisplayName } from "../types/workspace";

interface ConnectionPickerProps {
  connections: WorkspaceConnection[];
  activeConnectionId: string;
  onChange: (connectionId: string) => void;
}

export function ConnectionPicker({
  connections,
  activeConnectionId,
  onChange,
}: ConnectionPickerProps) {
  return (
    <label className="connection-picker">
      <select
        value={activeConnectionId}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Connection for this query"
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
