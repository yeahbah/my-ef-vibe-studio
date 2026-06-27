import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { commitGitFiles, fetchGitStatus, type GitStatusResult } from "../../lib/gitClient";
import {
  buildPackFromStudio,
  exportTeamPack,
  importTeamPack,
  readPackFromSyncDirectory,
  writePackToSyncDirectory,
  applyImportedPack,
} from "../../lib/pack";
import {
  buildDbSetSampleExpression,
  fetchDbInfoJson,
  fetchDescribeJson,
  fetchTablesJson,
} from "../../lib/schema";
import { yieldToUi } from "../../lib/yieldToUi";
import {
  formatShowInFileManagerLabel,
  getFileManagerLabel,
  showWorkspaceInFileManager,
} from "../../lib/fileManager";
import { BUILTIN_SNIPPETS } from "../../types/snippets";
import { pushCloudSync, pullCloudSync } from "../../lib/cloudSync";
import type { EvaluationHistoryEntry } from "../../lib/history";
import type { AppSettings, ConnectionSettings, PrerequisiteCheckResult } from "../../types/connection";
import type { QueryLibraryState } from "../../types/queryLibrary";
import type { QueryTab } from "../../types/query";
import type { SnippetDefinition } from "../../types/snippets";
import type { DbInfoJsonPayload, DescribeJsonPayload, TablesJsonPayload } from "../../types/schema";
import type { WorkspaceConnection, EfvibeWorkspace } from "../../types/workspace";
import { resolveSearchDirectory, workspaceConnectionToSettings } from "../../types/workspace";
import { ContextMenu } from "./ContextMenu";
import { DbInfoDialog } from "../DbInfoDialog";
import { DbSetPropertiesDialog } from "../DbSetPropertiesDialog";
import { WorkspacePropertiesDialog } from "../WorkspacePropertiesDialog";
import { IconMoon, IconNew, IconOpen, IconSave, IconSettings, IconSun, IconAbout, IconHelp } from "../icons";
import { AboutDialog } from "../AboutDialog";
import { HelpDialog } from "../HelpDialog";
import { TreeView } from "./TreeView";
import type { AppTheme } from "../../types/theme";
import type { ContextMenuItem, ExplorerNode } from "./types";

interface ExplorerSidebarProps {
  workspace: EfvibeWorkspace;
  workspaceName: string;
  documentPath: string;
  workspaceDirectory: string;
  appSettings: AppSettings;
  connections: WorkspaceConnection[];
  activeConnectionId: string;
  history: EvaluationHistoryEntry[];
  queryTabs: QueryTab[];
  queryLibrary: QueryLibraryState;
  userSnippets: SnippetDefinition[];
  teamSyncDirectory: string;
  cloudSyncDirectory: string;
  expandedNodeIds: string[];
  onExpandedNodeIdsChange: (ids: string[]) => void;
  onSelectConnection: (connectionId: string) => void;
  onAddConnection: () => void;
  onDuplicateConnection: (connectionId: string) => void;
  onRefreshConnection: (connectionId: string) => void;
  onRebuildConnection: (connectionId: string) => void;
  onDisconnectConnection: (connectionId: string) => void;
  onDeleteConnection: (connectionId: string) => void;
  onEditConnection: (connectionId: string) => void;
  onOpenQueryTab: (expression: string, connectionId: string, name?: string) => void;
  onHistorySelect: (expression: string) => void;
  onOpenLibraryQuery: (expression: string, connectionId: string, name?: string) => void;
  onInsertSnippet: (expression: string) => void;
  onRemoveSnippet: (id: string) => void;
  onImportPack: (
    snippets: SnippetDefinition[],
    queries: Array<{ name: string; expression: string; connectionId: string }>,
    folderNames: string[],
  ) => void;
  onStatus: (message: string) => void;
  onNewWorkspace: () => void;
  onOpenWorkspace: () => void;
  onSaveWorkspace: () => void;
  onRenameWorkspace: (name: string) => void;
  onUpdateWorkspace: (workspace: EfvibeWorkspace) => void;
  onOpenSettings: () => void;
  prerequisites?: PrerequisiteCheckResult;
  prerequisitesLoading?: boolean;
  aboutSearchDirectory: string;
  aboutToolPath: string;
  aboutDotnetFramework: string;
  onRequestEngine?: () => void;
  onEngineBusyChange?: (delta: number) => void;
  onOpenErDiagram?: (dbSet?: string) => void;
  theme: AppTheme;
  onToggleTheme: () => void;
}

interface ConnectionSchemaState {
  tables?: TablesJsonPayload;
  error?: string;
  loading?: boolean;
}

export function ExplorerSidebar(props: ExplorerSidebarProps) {
  const {
    workspace,
    workspaceName,
    documentPath,
    workspaceDirectory,
    appSettings,
    connections,
    activeConnectionId,
    history,
    queryTabs,
    queryLibrary,
    userSnippets,
    teamSyncDirectory,
    cloudSyncDirectory,
    expandedNodeIds,
    onExpandedNodeIdsChange,
    onSelectConnection,
    onAddConnection,
    onDuplicateConnection,
    onRefreshConnection,
    onRebuildConnection,
    onDisconnectConnection,
    onDeleteConnection,
    onEditConnection,
    onOpenQueryTab,
    onHistorySelect,
    onOpenLibraryQuery,
    onInsertSnippet,
    onRemoveSnippet,
    onImportPack,
    onStatus,
    onNewWorkspace,
    onOpenWorkspace,
    onSaveWorkspace,
    onRenameWorkspace,
    onUpdateWorkspace,
    onOpenSettings,
    prerequisites,
    prerequisitesLoading,
    aboutSearchDirectory,
    aboutToolPath,
    aboutDotnetFramework,
    onRequestEngine,
    onEngineBusyChange,
    onOpenErDiagram,
    theme,
    onToggleTheme,
  } = props;

  const expandedIds = useMemo(() => new Set(expandedNodeIds), [expandedNodeIds]);
  const [schemaByConnection, setSchemaByConnection] = useState<Record<string, ConnectionSchemaState>>(
    {},
  );
  const [gitStatus, setGitStatus] = useState<GitStatusResult | undefined>();
  const [gitLoading, setGitLoading] = useState(false);
  const [selectedGitFiles, setSelectedGitFiles] = useState<string[]>([]);
  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | undefined>();
  const [workspacePropertiesOpen, setWorkspacePropertiesOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [fileManagerLabel, setFileManagerLabel] = useState("file manager");
  const [dbInfoDialog, setDbInfoDialog] = useState<
    | {
        connectionName: string;
        loading: boolean;
        error?: string;
        payload?: DbInfoJsonPayload;
      }
    | undefined
  >();
  const [dbSetPropertiesDialog, setDbSetPropertiesDialog] = useState<
    | {
        dbSet: string;
        connectionName: string;
        loading: boolean;
        error?: string;
        payload?: DescribeJsonPayload;
      }
    | undefined
  >();

  const gitDirectory =
    workspaceDirectory && workspaceDirectory !== "." ? workspaceDirectory : teamSyncDirectory || ".";

  useEffect(() => {
    void getFileManagerLabel()
      .then(setFileManagerLabel)
      .catch((error) => {
        console.error("Failed to resolve file manager label:", error);
      });
  }, []);

  const schemaRefreshInFlight = useRef(new Set<string>());

  const refreshSchemaForConnection = useCallback(
    async (connectionId: string, force = false) => {
      if (schemaRefreshInFlight.current.has(connectionId)) {
        return;
      }

      const connection = connections.find((entry) => entry.id === connectionId);
      if (!connection) {
        return;
      }

      const { settings, searchDirectory: connectionSearchDirectory } = resolveConnectionSchemaContext(
        connection,
        workspaceDirectory,
        appSettings,
      );

      if (!connectionSearchDirectory) {
        setSchemaByConnection((current) => ({
          ...current,
          [connectionId]: { error: "Set search directory or EF project." },
        }));
        return;
      }

      if (!force) {
        const existing = schemaByConnection[connectionId];
        if (existing?.tables || existing?.loading) {
          return;
        }
      }

      onRequestEngine?.();
      schemaRefreshInFlight.current.add(connectionId);

      setSchemaByConnection((current) => ({
        ...current,
        [connectionId]: { ...current[connectionId], loading: true, error: undefined },
      }));

      onEngineBusyChange?.(1);
      await yieldToUi();

      try {
        const payload = await fetchTablesJson(
          settings,
          connectionSearchDirectory,
          connectionSearchDirectory,
        );
        if (!payload) {
          setSchemaByConnection((current) => ({
            ...current,
            [connectionId]: { error: "Could not load DbSets." },
          }));
          return;
        }

        setSchemaByConnection((current) => ({
          ...current,
          [connectionId]: { tables: payload },
        }));
      } catch (error) {
        setSchemaByConnection((current) => ({
          ...current,
          [connectionId]: {
            error: error instanceof Error ? error.message : String(error),
          },
        }));
      } finally {
        schemaRefreshInFlight.current.delete(connectionId);
        onEngineBusyChange?.(-1);
        setSchemaByConnection((current) => ({
          ...current,
          [connectionId]: { ...current[connectionId], loading: false },
        }));
      }
    },
    [appSettings, connections, onEngineBusyChange, onRequestEngine, schemaByConnection, workspaceDirectory],
  );

  const loadDbInfoForConnection = useCallback(
    async (connectionId: string) => {
      const connection = connections.find((entry) => entry.id === connectionId);
      if (!connection) {
        return;
      }

      const { settings, searchDirectory: connectionSearchDirectory } = resolveConnectionSchemaContext(
        connection,
        workspaceDirectory,
        appSettings,
      );

      setDbInfoDialog({
        connectionName: connection.name || connection.context || "Connection",
        loading: true,
      });

      if (!connectionSearchDirectory) {
        setDbInfoDialog({
          connectionName: connection.name || connection.context || "Connection",
          loading: false,
          error: "Set search directory or EF project.",
        });
        return;
      }

      onRequestEngine?.();
      onEngineBusyChange?.(1);
      await yieldToUi();

      try {
        const payload = await fetchDbInfoJson(
          settings,
          connectionSearchDirectory,
          connectionSearchDirectory,
        );

        if (!payload) {
          setDbInfoDialog({
            connectionName: connection.name || connection.context || "Connection",
            loading: false,
            error: "Could not load database info.",
          });
          return;
        }

        setDbInfoDialog({
          connectionName: connection.name || connection.context || "Connection",
          loading: false,
          payload,
        });
      } catch (error) {
        setDbInfoDialog({
          connectionName: connection.name || connection.context || "Connection",
          loading: false,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        onEngineBusyChange?.(-1);
      }
    },
    [appSettings, connections, onEngineBusyChange, onRequestEngine, workspaceDirectory],
  );

  const refreshGit = useCallback(async () => {
    setGitLoading(true);
    try {
      const status = await fetchGitStatus(gitDirectory);
      setGitStatus(status);
      const tabFiles = queryTabs.map((tab) => tab.filePath).filter(Boolean) as string[];
      const workspaceFile = documentPath ? [documentPath] : [];
      const available = [
        ...new Set([...status.dirtyFiles, ...status.untrackedFiles, ...tabFiles, ...workspaceFile]),
      ];
      setSelectedGitFiles((current) => {
        const retained = current.filter((file) => available.includes(file));
        return retained.length > 0 ? retained : available;
      });
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setGitLoading(false);
    }
  }, [documentPath, gitDirectory, onStatus, queryTabs]);

  useEffect(() => {
    void refreshGit();
  }, [gitDirectory]);

  const loadDbSetProperties = useCallback(
    async (connectionId: string, dbSet: string) => {
      const connection = connections.find((entry) => entry.id === connectionId);
      if (!connection) {
        return;
      }

      const connectionName = connection.name || connection.context || "Connection";
      const { settings, searchDirectory: connectionSearchDirectory } = resolveConnectionSchemaContext(
        connection,
        workspaceDirectory,
        appSettings,
      );

      setDbSetPropertiesDialog({
        dbSet,
        connectionName,
        loading: true,
      });

      if (!connectionSearchDirectory) {
        setDbSetPropertiesDialog({
          dbSet,
          connectionName,
          loading: false,
          error: "Set search directory or EF project.",
        });
        return;
      }

      onRequestEngine?.();
      onEngineBusyChange?.(1);
      await yieldToUi();

      try {
        const payload = await fetchDescribeJson(
          settings,
          connectionSearchDirectory,
          connectionSearchDirectory,
          dbSet,
        );

        if (!payload) {
          setDbSetPropertiesDialog({
            dbSet,
            connectionName,
            loading: false,
            error: `Could not describe ${dbSet}.`,
          });
          return;
        }

        setDbSetPropertiesDialog({
          dbSet,
          connectionName,
          loading: false,
          payload,
          error: payload.success === false ? payload.error ?? `Could not describe ${dbSet}.` : undefined,
        });
      } catch (error) {
        setDbSetPropertiesDialog({
          dbSet,
          connectionName,
          loading: false,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        onEngineBusyChange?.(-1);
      }
    },
    [
      appSettings,
      connections,
      onEngineBusyChange,
      onRequestEngine,
      workspaceDirectory,
    ],
  );

  const treeNodes = useMemo(
    () =>
      buildExplorerTree({
        workspaceName,
        documentPath,
        connections,
        activeConnectionId,
        schemaByConnection,
        queryTabs,
        userSnippets,
        history,
        gitStatus,
        gitLoading,
        selectedGitFiles,
      }),
    [
      activeConnectionId,
      connections,
      documentPath,
      gitLoading,
      gitStatus,
      history,
      queryTabs,
      schemaByConnection,
      selectedGitFiles,
      userSnippets,
      workspaceName,
    ],
  );

  function toggleExpand(nodeId: string) {
    const next = new Set(expandedIds);
    if (next.has(nodeId)) {
      next.delete(nodeId);
    } else {
      next.add(nodeId);
      const connectionId = connectionIdForSchemaNode(nodeId);
      if (connectionId) {
        void refreshSchemaForConnection(connectionId);
      }
    }
    onExpandedNodeIdsChange([...next]);
  }

  function activateNode(node: ExplorerNode) {
    if (node.kind === "connection") {
      const connectionId = node.id.replace("connection:", "");
      onSelectConnection(connectionId);
      void refreshSchemaForConnection(connectionId);
      onExpandedNodeIdsChange([
        ...new Set([...expandedNodeIds, node.id, `model:${connectionId}`]),
      ]);
      return;
    }

    if (node.kind === "snippet") {
      const snippetId = node.id.replace("snippet:", "");
      const snippet = [...BUILTIN_SNIPPETS, ...userSnippets].find((entry) => entry.id === snippetId);
      if (snippet) {
        onInsertSnippet(snippet.expression);
      }
      return;
    }

    if (node.kind === "history") {
      const index = Number(node.id.replace("history:", ""));
      const entry = history[index];
      if (entry) {
        onHistorySelect(entry.expression);
      }
      return;
    }

    if (node.kind === "git-file") {
      const file = node.id.replace("team:git:file:", "");
      setSelectedGitFiles((current) =>
        current.includes(file) ? current.filter((entry) => entry !== file) : [...current, file],
      );
    }
  }

  function openContextMenu(node: ExplorerNode | undefined, x: number, y: number) {
    setMenu({
      x,
      y,
      items: buildContextMenuItems(node, {
        treeNodes,
        workspaceName,
        documentPath,
        fileManagerLabel,
        connections,
        userSnippets,
        history,
        selectedGitFiles,
        onExpandedNodeIdsChange,
        onSelectConnection,
        onAddConnection,
        onDuplicateConnection,
        onRefreshConnection,
        onRebuildConnection,
        onDisconnectConnection,
        onDeleteConnection,
        onEditConnection,
        onOpenQueryTab,
        onHistorySelect,
        onInsertSnippet,
        onRemoveSnippet,
        onImportPack,
        onStatus,
        onRenameWorkspace,
        onOpenWorkspaceProperties: () => setWorkspacePropertiesOpen(true),
        activeConnectionId,
        refreshSchemaForConnection,
        loadDbInfoForConnection,
        onOpenErDiagram,
        loadDbSetProperties,
        refreshGit,
        gitDirectory,
        handleExportPack,
        handleImportPack,
        handleSyncPush,
        handleSyncPull,
        handleCloudPush,
        handleCloudPull,
      }),
    });
  }

  async function handleExportPack() {
    try {
      const path = await exportTeamPack("team-pack", queryTabs, userSnippets, queryLibrary);
      if (path) {
        onStatus(`Exported pack to ${path}`);
      }
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleImportPack() {
    try {
      const pack = await importTeamPack();
      if (!pack) {
        return;
      }
      const applied = applyImportedPack(pack, queryTabs[0]?.connectionId ?? "");
      onImportPack(applied.snippets, applied.queries, applied.folderNames);
      onStatus(`Imported pack ${pack.name}`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSyncPush() {
    if (!teamSyncDirectory.trim()) {
      onStatus("Set a team sync directory in Settings.");
      return;
    }
    try {
      const pack = buildPackFromStudio("team-sync", queryTabs, userSnippets, queryLibrary);
      const path = await writePackToSyncDirectory(teamSyncDirectory, pack);
      onStatus(`Pushed favorites to ${path}`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSyncPull() {
    if (!teamSyncDirectory.trim()) {
      onStatus("Set a team sync directory in Settings.");
      return;
    }
    try {
      const pack = await readPackFromSyncDirectory(teamSyncDirectory);
      if (!pack) {
        onStatus("No team-pack.efvibe-pack in sync directory.");
        return;
      }
      const applied = applyImportedPack(pack, queryTabs[0]?.connectionId ?? activeConnectionId);
      onImportPack(applied.snippets, applied.queries, applied.folderNames);
      onStatus(`Pulled pack ${pack.name}`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleCloudPush() {
    if (!cloudSyncDirectory.trim()) {
      onStatus("Set a cloud sync directory in Settings.");
      return;
    }

    try {
      const result = await pushCloudSync(
        cloudSyncDirectory,
        queryTabs,
        userSnippets,
        queryLibrary,
        activeConnectionId,
      );
      onStatus(`Pushed ${result.queryCount} favorite queries to cloud sync.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleCloudPull() {
    if (!cloudSyncDirectory.trim()) {
      onStatus("Set a cloud sync directory in Settings.");
      return;
    }

    try {
      const result = await pullCloudSync(cloudSyncDirectory, activeConnectionId);
      for (const query of result.queries) {
        onOpenLibraryQuery(query.expression, query.connectionId, query.name);
      }

      if (result.pack) {
        const applied = applyImportedPack(result.pack, activeConnectionId);
        onImportPack(applied.snippets, applied.queries, applied.folderNames);
      }

      if (result.queries.length === 0 && !result.pack) {
        onStatus("Cloud sync folder is empty.");
        return;
      }

      onStatus(
        `Pulled ${result.queries.length} queries${result.pack ? ` and pack ${result.pack.name}` : ""} from cloud sync.`,
      );
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <aside className="sidebar explorer-sidebar">
      <div className="sidebar-toolbar" role="toolbar" aria-label="Workspace">
        <button type="button" className="sidebar-icon-btn" title="New workspace" aria-label="New workspace" onClick={onNewWorkspace}>
          <IconNew />
        </button>
        <button type="button" className="sidebar-icon-btn" title="Open workspace" aria-label="Open workspace" onClick={onOpenWorkspace}>
          <IconOpen />
        </button>
        <button type="button" className="sidebar-icon-btn" title="Save workspace" aria-label="Save workspace" onClick={onSaveWorkspace}>
          <IconSave />
        </button>
      </div>

      <TreeView
        nodes={treeNodes}
        expandedIds={expandedIds}
        onToggleExpand={toggleExpand}
        onActivate={activateNode}
        onContextMenu={openContextMenu}
      />

      <div className="sidebar-footer" role="toolbar" aria-label="Appearance, help, and settings">
        <button
          type="button"
          className="sidebar-icon-btn"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? <IconSun /> : <IconMoon />}
        </button>
        <button
          type="button"
          className="sidebar-icon-btn"
          onClick={() => setHelpOpen(true)}
          title="Help"
          aria-label="Help"
        >
          <IconHelp />
        </button>
        <button
          type="button"
          className="sidebar-icon-btn"
          onClick={() => setAboutOpen(true)}
          title="About"
          aria-label="About"
        >
          <IconAbout />
        </button>
        <button
          type="button"
          className="sidebar-icon-btn"
          onClick={onOpenSettings}
          title="Settings"
          aria-label="Settings"
        >
          <IconSettings />
        </button>
      </div>

      {menu ? (
        <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(undefined)} />
      ) : null}

      <DbInfoDialog
        open={dbInfoDialog !== undefined}
        connectionName={dbInfoDialog?.connectionName ?? ""}
        loading={dbInfoDialog?.loading ?? false}
        error={dbInfoDialog?.error}
        payload={dbInfoDialog?.payload}
        onClose={() => setDbInfoDialog(undefined)}
      />

      <WorkspacePropertiesDialog
        open={workspacePropertiesOpen}
        workspace={workspace}
        documentPath={documentPath}
        onClose={() => setWorkspacePropertiesOpen(false)}
        onApply={onUpdateWorkspace}
      />

      <DbSetPropertiesDialog
        open={dbSetPropertiesDialog !== undefined}
        dbSet={dbSetPropertiesDialog?.dbSet ?? ""}
        connectionName={dbSetPropertiesDialog?.connectionName ?? ""}
        loading={dbSetPropertiesDialog?.loading ?? false}
        error={dbSetPropertiesDialog?.error}
        payload={dbSetPropertiesDialog?.payload}
        onClose={() => setDbSetPropertiesDialog(undefined)}
      />

      <AboutDialog
        open={aboutOpen}
        searchDirectory={aboutSearchDirectory}
        toolPath={aboutToolPath}
        dotnetFramework={aboutDotnetFramework}
        prerequisites={prerequisites}
        prerequisitesLoading={prerequisitesLoading ?? false}
        onClose={() => setAboutOpen(false)}
      />

      <HelpDialog open={helpOpen} settings={appSettings} onClose={() => setHelpOpen(false)} />
    </aside>
  );
}

function buildExplorerTree(input: {
  workspaceName: string;
  documentPath: string;
  connections: WorkspaceConnection[];
  activeConnectionId: string;
  schemaByConnection: Record<string, ConnectionSchemaState>;
  queryTabs: QueryTab[];
  userSnippets: SnippetDefinition[];
  history: EvaluationHistoryEntry[];
  gitStatus: GitStatusResult | undefined;
  gitLoading: boolean;
  selectedGitFiles: string[];
}): ExplorerNode[] {
  return [
    {
      id: "workspace",
      label: input.workspaceName,
      subtitle: input.documentPath ? truncate(input.documentPath, 36) : "Unsaved workspace",
      kind: "section",
      children: [
        {
          id: "connections",
          label: "Connections",
          kind: "section",
          children: input.connections.map((connection) => {
            const schema = input.schemaByConnection[connection.id];
            return {
              id: `connection:${connection.id}`,
              label: connection.name || connection.context || "Unnamed",
              subtitle: connection.context || "Auto-discover",
              kind: "connection" as const,
              active: connection.id === input.activeConnectionId,
              children: [
                {
                  id: `model:${connection.id}`,
                  label: "Model",
                  subtitle: schema?.tables?.dbContext,
                  kind: "section" as const,
                  children: buildModelChildren(
                    connection.id,
                    input.activeConnectionId,
                    schema,
                  ),
                },
              ],
            };
          }),
        },
        {
          id: "team",
          label: "Team",
          kind: "section",
          children: [
            {
              id: "team:git",
              label: "Git",
              subtitle: input.gitStatus?.isRepo ? input.gitStatus.branch ?? "repo" : "no repo",
              kind: "folder",
              children: input.gitStatus?.isRepo
                ? studioGitFiles(input.gitStatus, input.queryTabs, input.documentPath).map((file) => ({
                    id: `team:git:file:${file}`,
                    label: file.split(/[/\\]/).pop() ?? file,
                    subtitle: file,
                    kind: "git-file" as const,
                    checked: input.selectedGitFiles.includes(file),
                  }))
                : [
                    {
                      id: "team:git:none",
                      label: input.gitLoading ? "Refreshing…" : "No git repository",
                      kind: "info" as const,
                      muted: true,
                    },
                  ],
            },
          ],
        },
      ],
    },
  ];
}

function buildContextMenuItems(
  node: ExplorerNode | undefined,
  ctx: Record<string, unknown>,
): ContextMenuItem[] {
  const treeNodes = ctx.treeNodes as ExplorerNode[];
  const connections = ctx.connections as WorkspaceConnection[];
  const userSnippets = ctx.userSnippets as SnippetDefinition[];
  const history = ctx.history as EvaluationHistoryEntry[];
  const selectedGitFiles = ctx.selectedGitFiles as string[];
  const onExpandedNodeIdsChange = ctx.onExpandedNodeIdsChange as (ids: string[]) => void;
  const onSelectConnection = ctx.onSelectConnection as (id: string) => void;
  const onAddConnection = ctx.onAddConnection as () => void;
  const onDuplicateConnection = ctx.onDuplicateConnection as (id: string) => void;
  const onRefreshConnection = ctx.onRefreshConnection as (id: string) => void;
  const onRebuildConnection = ctx.onRebuildConnection as (id: string) => void;
  const onDisconnectConnection = ctx.onDisconnectConnection as (id: string) => void;
  const onDeleteConnection = ctx.onDeleteConnection as (id: string) => void;
  const onEditConnection = ctx.onEditConnection as (id: string) => void;
  const onOpenQueryTab = ctx.onOpenQueryTab as (
    expression: string,
    connectionId: string,
    name?: string,
  ) => void;
  const onHistorySelect = ctx.onHistorySelect as (expr: string) => void;
  const onInsertSnippet = ctx.onInsertSnippet as (expr: string) => void;
  const onRemoveSnippet = ctx.onRemoveSnippet as (id: string) => void;
  const onStatus = ctx.onStatus as (message: string) => void;
  const activeConnectionId = ctx.activeConnectionId as string;
  const refreshSchemaForConnection = ctx.refreshSchemaForConnection as (
    connectionId: string,
    force?: boolean,
  ) => Promise<void>;
  const loadDbInfoForConnection = ctx.loadDbInfoForConnection as (connectionId: string) => Promise<void>;
  const onOpenErDiagram = ctx.onOpenErDiagram as ((dbSet?: string) => void) | undefined;
  const loadDbSetProperties = ctx.loadDbSetProperties as (connectionId: string, dbSet: string) => Promise<void>;
  const refreshGit = ctx.refreshGit as () => Promise<void>;
  const gitDirectory = ctx.gitDirectory as string;
  const handleExportPack = ctx.handleExportPack as () => Promise<void>;
  const handleImportPack = ctx.handleImportPack as () => Promise<void>;
  const handleSyncPush = ctx.handleSyncPush as () => Promise<void>;
  const handleSyncPull = ctx.handleSyncPull as () => Promise<void>;
  const handleCloudPush = ctx.handleCloudPush as () => Promise<void>;
  const handleCloudPull = ctx.handleCloudPull as () => Promise<void>;

  if (!node) {
    return [
      {
        id: "expand-all",
        label: "Expand all",
        onClick: () => onExpandedNodeIdsChange(collectExpandableIds(treeNodes)),
      },
      { id: "collapse-all", label: "Collapse all", onClick: () => onExpandedNodeIdsChange(["workspace"]) },
    ];
  }

  if (node.id === "workspace") {
    const workspaceName = ctx.workspaceName as string;
    const documentPath = ctx.documentPath as string;
    const fileManagerLabel = ctx.fileManagerLabel as string;
    const onRenameWorkspace = ctx.onRenameWorkspace as (name: string) => void;
    const onOpenWorkspaceProperties = ctx.onOpenWorkspaceProperties as () => void;
    const onStatus = ctx.onStatus as (message: string) => void;

    return [
      { id: "properties", label: "Properties", onClick: onOpenWorkspaceProperties },
      {
        id: "rename",
        label: "Rename",
        onClick: () => {
          const nextName = window.prompt("Workspace name", workspaceName);
          if (nextName?.trim() && nextName.trim() !== workspaceName) {
            onRenameWorkspace(nextName.trim());
          }
        },
      },
      {
        id: "show-in-file-manager",
        label: formatShowInFileManagerLabel(fileManagerLabel),
        disabled: !documentPath,
        onClick: () => {
          void showWorkspaceInFileManager(documentPath).catch((error) => {
            onStatus(error instanceof Error ? error.message : String(error));
          });
        },
      },
    ];
  }

  if (node.id === "connections") {
    return [{ id: "add-connection", label: "Add connection", onClick: onAddConnection }];
  }

  if (node.kind === "connection") {
    const connectionId = node.id.replace("connection:", "");
    return [
      { id: "select", label: "Activate", onClick: () => onSelectConnection(connectionId) },
      {
        id: "disconnect",
        label: "Disconnect",
        disabled: connectionId !== activeConnectionId,
        onClick: () => onDisconnectConnection(connectionId),
      },
      { id: "refresh", label: "Refresh", onClick: () => onRefreshConnection(connectionId) },
      { id: "rebuild", label: "Rebuild", onClick: () => onRebuildConnection(connectionId) },
      { id: "db-info", label: "DB Info", onClick: () => void loadDbInfoForConnection(connectionId) },
      {
        id: "view-diagram",
        label: "ER Diagram",
        onClick: () => {
          if (connectionId !== activeConnectionId) {
            onSelectConnection(connectionId);
          }
          onOpenErDiagram?.();
        },
      },
      { id: "edit", label: "Edit…", onClick: () => onEditConnection(connectionId) },
      { id: "dup", label: "Duplicate", onClick: () => onDuplicateConnection(connectionId) },
      {
        id: "delete",
        label: "Delete",
        disabled: connections.length <= 1,
        onClick: () => onDeleteConnection(connectionId),
      },
    ];
  }

  if (node.id === "model" || (node.id.startsWith("model:") && node.kind === "section")) {
    const connectionId = node.id === "model" ? activeConnectionId : node.id.slice("model:".length);
    return [
      {
        id: "refresh-model",
        label: "Refresh model",
        onClick: () => void refreshSchemaForConnection(connectionId, true),
      },
      {
        id: "view-diagram",
        label: "ER Diagram",
        onClick: () => {
          if (connectionId !== activeConnectionId) {
            onSelectConnection(connectionId);
          }
          onOpenErDiagram?.();
        },
      },
    ];
  }

  if (node.kind === "dbset") {
    const parsed = parseDbSetNodeId(node.id);
    if (!parsed) {
      return [];
    }

    const { connectionId, dbSet } = parsed;
    return [
      {
        id: "query",
        label: "Query",
        onClick: () => {
          if (connectionId !== activeConnectionId) {
            onSelectConnection(connectionId);
          }
          onOpenQueryTab(buildDbSetSampleExpression(dbSet), connectionId, dbSet);
        },
      },
      {
        id: "er-diagram",
        label: "ER Diagram",
        onClick: () => {
          if (connectionId !== activeConnectionId) {
            onSelectConnection(connectionId);
          }
          onOpenErDiagram?.(dbSet);
        },
      },
      {
        id: "properties",
        label: "Properties",
        onClick: () => void loadDbSetProperties(connectionId, dbSet),
      },
    ];
  }

  if (node.kind === "snippet") {
    const snippetId = node.id.replace("snippet:", "");
    const custom = userSnippets.find((entry) => entry.id === snippetId);
    return [
      {
        id: "insert",
        label: "Insert into editor",
        onClick: () => {
          const target = [...BUILTIN_SNIPPETS, ...userSnippets].find((entry) => entry.id === snippetId);
          if (target) {
            onInsertSnippet(target.expression);
          }
        },
      },
      {
        id: "remove",
        label: "Remove",
        disabled: !custom,
        onClick: () => onRemoveSnippet(snippetId),
      },
    ];
  }

  if (node.kind === "history") {
    const index = Number(node.id.replace("history:", ""));
    const entry = history[index];
    if (!entry) {
      return [];
    }
    return [{ id: "restore", label: "Restore query", onClick: () => onHistorySelect(entry.expression) }];
  }

  if (node.id === "team:git") {
    return [
      { id: "git-refresh", label: "Refresh git status", onClick: () => void refreshGit() },
      {
        id: "git-commit",
        label: "Commit selected…",
        disabled: selectedGitFiles.length === 0,
        onClick: () => {
          const message = window.prompt("Commit message", "Update efvibe queries");
          if (!message?.trim()) {
            return;
          }
          void commitGitFiles(gitDirectory, message.trim(), selectedGitFiles)
            .then((result) => {
              onStatus(result.committed ? "Committed efvibe files." : result.output);
              return refreshGit();
            })
            .catch((error) => onStatus(error instanceof Error ? error.message : String(error)));
        },
      },
    ];
  }

  if (node.id === "team") {
    return [
      { id: "export-pack", label: "Export team pack", onClick: () => void handleExportPack() },
      { id: "import-pack", label: "Import team pack", onClick: () => void handleImportPack() },
      { id: "sync-push", label: "Push favorites to sync folder", onClick: () => void handleSyncPush() },
      { id: "sync-pull", label: "Pull pack from sync folder", onClick: () => void handleSyncPull() },
      { id: "cloud-push", label: "Push to cloud sync", onClick: () => void handleCloudPush() },
      { id: "cloud-pull", label: "Pull from cloud sync", onClick: () => void handleCloudPull() },
    ];
  }

  return [];
}

function buildModelChildren(
  connectionId: string,
  activeConnectionId: string,
  schema: ConnectionSchemaState | undefined,
): ExplorerNode[] {
  if (!schema) {
    if (connectionId !== activeConnectionId) {
      return [
        {
          id: `model:${connectionId}:idle`,
          label: "Expand connection to load",
          kind: "info",
          muted: true,
        },
      ];
    }

    return [
      {
        id: `model:${connectionId}:idle`,
        label: "Expand or right-click to load",
        kind: "info",
        muted: true,
      },
    ];
  }

  if (schema.loading) {
    return [
      {
        id: `model:${connectionId}:loading`,
        label: "Loading DbSets…",
        kind: "info",
        muted: true,
      },
    ];
  }

  if (schema.error) {
    return [{ id: `model:${connectionId}:error`, label: schema.error, kind: "info", muted: true }];
  }

  return (schema.tables?.tables ?? []).map((entry) => ({
    id: `dbset:${connectionId}:${entry.dbSet}`,
    label: entry.dbSet,
    subtitle: entry.entityType,
    kind: "dbset" as const,
  }));
}

function resolveConnectionSchemaContext(
  connection: WorkspaceConnection,
  workspaceDirectory: string,
  appSettings: AppSettings,
): { settings: ConnectionSettings; searchDirectory: string } {
  const settings = workspaceConnectionToSettings(
    connection,
    workspaceDirectory,
    appSettings.toolPath,
    appSettings.defaultWorkspaceRoot,
  );
  const searchDirectory = resolveSearchDirectory(
    connection,
    workspaceDirectory,
    settings.project,
  );

  return { settings, searchDirectory };
}

function connectionIdForSchemaNode(nodeId: string): string | undefined {
  if (nodeId.startsWith("connection:")) {
    return nodeId.slice("connection:".length);
  }

  if (nodeId.startsWith("model:")) {
    const connectionId = nodeId.slice("model:".length);
    return connectionId.includes(":") ? undefined : connectionId;
  }

  return undefined;
}

function parseDbSetNodeId(nodeId: string): { connectionId: string; dbSet: string } | undefined {
  if (!nodeId.startsWith("dbset:")) {
    return undefined;
  }

  const rest = nodeId.slice("dbset:".length);
  const separator = rest.indexOf(":");
  if (separator === -1) {
    return undefined;
  }

  return {
    connectionId: rest.slice(0, separator),
    dbSet: rest.slice(separator + 1),
  };
}

function studioGitFiles(
  status: GitStatusResult,
  queryTabs: QueryTab[],
  workspacePath: string,
): string[] {
  const tabFiles = queryTabs.map((tab) => tab.filePath).filter(Boolean) as string[];
  const workspaceFile = workspacePath ? [workspacePath] : [];
  return [...new Set([...status.dirtyFiles, ...status.untrackedFiles, ...tabFiles, ...workspaceFile])];
}

function collectExpandableIds(nodes: ExplorerNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    ids.push(node.id);
    if (node.children?.length) {
      ids.push(...collectExpandableIds(node.children));
    }
  }
  return ids;
}

function truncate(value: string, max: number): string {
  const trimmed = value.trim().replace(/\s+/gu, " ");
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}
