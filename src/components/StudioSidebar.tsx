import type { SidebarTab } from "../lib/settings";
import { ConnectionsPanel } from "./ConnectionsPanel";
import { HistoryPanel } from "./HistoryPanel";
import { QueryLibraryPanel } from "./QueryLibraryPanel";
import { ScanPanel } from "./ScanPanel";
import { SchemaExplorer } from "./SchemaExplorer";
import { SnippetsPanel } from "./SnippetsPanel";
import { TeamPanel } from "./TeamPanel";
import type { EvaluationHistoryEntry } from "../lib/history";
import type { ConnectionSettings, PreferredEditor } from "../types/connection";
import type { QueryLibraryState } from "../types/queryLibrary";
import type { QueryTab } from "../types/query";
import type { SnippetDefinition } from "../types/snippets";
import type { WorkspaceConnection } from "../types/workspace";

interface StudioSidebarProps {
  documentPath: string;
  workspaceDirectory: string;
  workspaceName: string;
  sidebarTab: SidebarTab;
  connections: WorkspaceConnection[];
  activeConnectionId: string;
  connectionSettings: ConnectionSettings | undefined;
  searchDirectory: string;
  history: EvaluationHistoryEntry[];
  queryTabs: QueryTab[];
  queryLibrary: QueryLibraryState;
  userSnippets: SnippetDefinition[];
  onSidebarTabChange: (tab: SidebarTab) => void;
  onSelectConnection: (connectionId: string) => void;
  onAddConnection: () => void;
  onDuplicateConnection: (connectionId: string) => void;
  onDeleteConnection: (connectionId: string) => void;
  onEditConnection: (connectionId: string) => void;
  onRunExpression: (expression: string) => void;
  onHistorySelect: (expression: string) => void;
  onGoToSource: (file: string, line: number) => void;
  onOpenLibraryQuery: (expression: string, connectionId: string, name?: string) => void;
  onToggleFavorite: (tabId: string) => void;
  onAddFolder: (name: string) => void;
  onAssignFolder: (tabId: string, folderId?: string) => void;
  onInsertSnippet: (expression: string) => void;
  onAddSnippet: (title: string, expression: string) => void;
  onRemoveSnippet: (id: string) => void;
  teamSyncDirectory: string;
  preferredEditor: PreferredEditor;
  installedPackIds: string[];
  onImportPack: (
    snippets: import("../types/snippets").SnippetDefinition[],
    queries: Array<{ name: string; expression: string; connectionId: string }>,
    folderNames: string[],
  ) => void;
  onInstallPackId: (packId: string) => void;
  onTeamStatus: (message: string) => void;
}

const TABS: Array<{ id: SidebarTab; label: string }> = [
  { id: "connections", label: "Conn" },
  { id: "schema", label: "Schema" },
  { id: "library", label: "Library" },
  { id: "snippets", label: "Snips" },
  { id: "history", label: "History" },
  { id: "scan", label: "Scan" },
  { id: "team", label: "Team" },
];

export function StudioSidebar({
  documentPath,
  workspaceDirectory,
  workspaceName,
  sidebarTab,
  connections,
  activeConnectionId,
  connectionSettings,
  searchDirectory,
  history,
  queryTabs,
  queryLibrary,
  userSnippets,
  onSidebarTabChange,
  onSelectConnection,
  onAddConnection,
  onDuplicateConnection,
  onDeleteConnection,
  onEditConnection,
  onRunExpression,
  onHistorySelect,
  onGoToSource,
  onOpenLibraryQuery,
  onToggleFavorite,
  onAddFolder,
  onAssignFolder,
  onInsertSnippet,
  onAddSnippet,
  onRemoveSnippet,
  teamSyncDirectory,
  preferredEditor,
  installedPackIds,
  onImportPack,
  onInstallPackId,
  onTeamStatus,
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

      <div className="sidebar-tabs sidebar-tabs-3">
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
      {sidebarTab === "library" && (
        <QueryLibraryPanel
          library={queryLibrary}
          queryTabs={queryTabs}
          onOpenQuery={onOpenLibraryQuery}
          onToggleFavorite={onToggleFavorite}
          onAddFolder={onAddFolder}
          onAssignFolder={onAssignFolder}
        />
      )}
      {sidebarTab === "snippets" && (
        <SnippetsPanel
          userSnippets={userSnippets}
          onInsert={onInsertSnippet}
          onAddSnippet={onAddSnippet}
          onRemoveSnippet={onRemoveSnippet}
        />
      )}
      {sidebarTab === "history" && (
        <HistoryPanel history={history} onSelect={onHistorySelect} />
      )}
      {sidebarTab === "scan" && (
        <ScanPanel
          connectionSettings={connectionSettings}
          searchDirectory={searchDirectory}
          preferredEditor={preferredEditor}
          onGoToSource={onGoToSource}
        />
      )}
      {sidebarTab === "team" && (
        <TeamPanel
          workspaceDirectory={workspaceDirectory}
          workspacePath={documentPath}
          queryTabs={queryTabs}
          userSnippets={userSnippets}
          queryLibrary={queryLibrary}
          teamSyncDirectory={teamSyncDirectory}
          preferredEditor={preferredEditor}
          installedPackIds={installedPackIds}
          onImportPack={onImportPack}
          onInstallPackId={onInstallPackId}
          onStatus={onTeamStatus}
        />
      )}
    </aside>
  );
}
