import type { EfvibeWorkspace } from "../types/workspace";

interface WorkspaceSidebarProps {
  documentPath: string;
  workspace: EfvibeWorkspace;
  activeConnectionId: string;
  onSelectConnection: (connectionId: string) => void;
  onAddConnection: () => void;
}

export function WorkspaceSidebar({
  documentPath,
  workspace,
  activeConnectionId,
  onSelectConnection,
  onAddConnection,
}: WorkspaceSidebarProps) {
  return (
    <aside className="sidebar">
      <section>
        <h2>Workspace</h2>
        <p className="sidebar-meta">{workspace.name}</p>
        {documentPath ? <p className="sidebar-path">{documentPath}</p> : <p className="sidebar-path muted">Unsaved</p>}
      </section>

      <section>
        <div className="sidebar-header">
          <h3>Connections</h3>
          <button type="button" onClick={onAddConnection}>
            Add
          </button>
        </div>
        <ul className="connection-list">
          {workspace.connections.map((connection) => (
            <li key={connection.id}>
              <button
                type="button"
                className={connection.id === activeConnectionId ? "connection active" : "connection"}
                onClick={() => onSelectConnection(connection.id)}
              >
                <span>{connection.name || connection.context || "Unnamed"}</span>
                <small>{connection.context || "Auto-discover"}</small>
              </button>
            </li>
          ))}
          {workspace.connections.length === 0 && (
            <li className="muted">Add a connection to run queries.</li>
          )}
        </ul>
      </section>

      <section>
        <h3>Projects</h3>
        <ul className="project-list">
          {workspace.projects.map((project) => (
            <li key={project.path}>{project.path}</li>
          ))}
          {workspace.projects.length === 0 && <li className="muted">No projects registered yet.</li>}
        </ul>
      </section>
    </aside>
  );
}

export function getActiveConnection(
  workspace: EfvibeWorkspace,
  activeConnectionId: string,
) {
  return workspace.connections.find((connection) => connection.id === activeConnectionId);
}
