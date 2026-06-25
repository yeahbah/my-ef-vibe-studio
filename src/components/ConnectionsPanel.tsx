import type { WorkspaceConnection } from "../types/workspace";

interface ConnectionsPanelProps {
  connections: WorkspaceConnection[];
  activeConnectionId: string;
  onSelect: (connectionId: string) => void;
  onAdd: () => void;
  onDuplicate: (connectionId: string) => void;
  onDelete: (connectionId: string) => void;
  onEdit: (connectionId: string) => void;
}

export function ConnectionsPanel({
  connections,
  activeConnectionId,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onEdit,
}: ConnectionsPanelProps) {
  return (
    <section className="sidebar-panel">
      <div className="sidebar-header">
        <h3>Connections</h3>
        <button type="button" onClick={onAdd}>
          Add
        </button>
      </div>
      <ul className="connection-list">
        {connections.map((connection) => (
          <li key={connection.id} className="connection-row">
            <button
              type="button"
              className={connection.id === activeConnectionId ? "connection active" : "connection"}
              onClick={() => onSelect(connection.id)}
            >
              <span>{connection.name || connection.context || "Unnamed"}</span>
              <small>{connection.context || "Auto-discover"}</small>
            </button>
            <div className="connection-actions">
              <button type="button" onClick={() => onEdit(connection.id)} title="Edit">
                Edit
              </button>
              <button type="button" onClick={() => onDuplicate(connection.id)} title="Duplicate">
                Dup
              </button>
              {connections.length > 1 && (
                <button type="button" onClick={() => onDelete(connection.id)} title="Delete">
                  Del
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
