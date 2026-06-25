import type { SidebarTab } from "../lib/settings";
import { ConnectionsPanel } from "./ConnectionsPanel";
import { HistoryPanel } from "./HistoryPanel";
import { ScanPanel } from "./ScanPanel";
import { SchemaExplorer } from "./SchemaExplorer";
import type { EvaluationHistoryEntry } from "../lib/history";
import type { ConnectionSettings } from "../types/connection";
import type { WorkspaceConnection } from "../types/workspace";

interface StudioSidebarProps {
  documentPath: string;
  workspaceName: string;
  sidebarTab: SidebarTab;
  connections: WorkspaceConnection[];
  activeConnectionId: string;
  connectionSettings: ConnectionSettings | undefined;
  searchDirectory: string;
  history: EvaluationHistoryEntry[];
  onSidebarTabChange: (tab: SidebarTab) => void;
  onSelectConnection: (connectionId: string) => void;
  onAddConnection: () => void;
  onDuplicateConnection: (connectionId: string) => void;
  onDeleteConnection: (connectionId: string) => void;
  onEditConnection: (connectionId: string) => void;
  onRunExpression: (expression: string) => void;
  onHistorySelect: (expression: string) => void;
  onGoToSource: (file: string, line: number) => void;
}

const TABS: Array<{ id: SidebarTab; label: string }> = [
  { id: "connections", label: "Connections" },
  { id: "schema", label: "Schema" },
  { id: "history", label: "History" },
  { id: "scan", label: "Scan" },
];

export function StudioSidebar({
  documentPath,
  workspaceName,
  sidebarTab,
  connections,
  activeConnectionId,
  connectionSettings,
  searchDirectory,
  history,
  onSidebarTabChange,
  onSelectConnection,
  onAddConnection,
  onDuplicateConnection,
  onDeleteConnection,
  onEditConnection,
  onRunExpression,
  onHistorySelect,
  onGoToSource,
}: StudioSidebarProps) {
  return (
    <aside className="sidebar">
      <section className="sidebar-workspace">
        <h2>Workspace</h2>
        <p className="sidebar-meta">{workspaceName}</p>
        {documentPath ? (
          <p className="sidebar-path">{documentPath}</p>
        ) : (
          <p className="sidebar-path muted">Unsaved</p>
        )}
      </section>

      <div className="sidebar-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={sidebarTab === tab.id ? "sidebar-tab active" : "sidebar-tab"}
            onClick={() => onSidebarTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {sidebarTab === "connections" && (
        <ConnectionsPanel
          connections={connections}
          activeConnectionId={activeConnectionId}
          onSelect={onSelectConnection}
          onAdd={onAddConnection}
          onDuplicate={onDuplicateConnection}
          onDelete={onDeleteConnection}
          onEdit={onEditConnection}
        />
      )}
      {sidebarTab === "schema" && (
        <SchemaExplorer
          connectionSettings={connectionSettings}
          searchDirectory={searchDirectory}
          onRunExpression={onRunExpression}
        />
      )}
      {sidebarTab === "history" && (
        <HistoryPanel history={history} onSelect={onHistorySelect} />
      )}
      {sidebarTab === "scan" && (
        <ScanPanel
          connectionSettings={connectionSettings}
          searchDirectory={searchDirectory}
          onGoToSource={onGoToSource}
        />
      )}
    </aside>
  );
}
