import type { WorkspaceConnection } from "../types/workspace";

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
      <span>Connection</span>
      <select value={activeConnectionId} onChange={(event) => onChange(event.target.value)}>
        {connections.map((connection) => (
          <option key={connection.id} value={connection.id}>
            {connection.name || connection.context || "Unnamed"}
          </option>
        ))}
      </select>
    </label>
  );
}
