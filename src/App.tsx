import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { homeDir } from "@tauri-apps/api/path";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { IconSidebar } from "./components/icons";
import { SplashScreen } from "./components/SplashScreen";
import { StatusBarBusy } from "./components/StatusBarBusy";
import { ErDiagramView } from "./components/ErDiagramView";
import { EditorToolPanel } from "./components/EditorToolPanel";
import { EditorToolRail, type EditorToolId } from "./components/EditorToolRail";
import { MainViewSwitcher } from "./components/MainViewSwitcher";
import { NotebookView, type NotebookRunScope } from "./components/NotebookView";
import { QueryWorkspace, type QueryWorkspaceHandle } from "./components/QueryWorkspace";
import { ReplView } from "./components/ReplView";
import { QueryPaneLayout } from "./components/QueryPaneLayout";
import { TabDragController } from "./components/TabDragController";
import { QueryTabBar, type QueryTabRenameRequest } from "./components/QueryTabBar";
import { QueryTabToolbar } from "./components/QueryTabToolbar";
import { ResizableResultsDock, DEFAULT_RESULTS_DOCK_HEIGHT } from "./components/ResizableResultsDock";
import {
  ResizableEditorToolPanel,
  DEFAULT_EDITOR_TOOL_PANEL_WIDTH,
} from "./components/ResizableEditorToolPanel";
import { ResultsTabs } from "./components/ResultsTabs";
import { ConnectionPanel } from "./components/ConnectionPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { SourceTabWorkspace } from "./components/SourceTabWorkspace";
import { ExplorerSidebar } from "./components/explorer/ExplorerSidebar";
import { resolveExplorerExpandedNodes, normalizeExplorerExpandedNodes } from "./components/explorer/types";
import {
  cancelEfvibeDaemonRequest,
  checkPrerequisites,
  invalidateEfvibeDaemon,
  rebuildEfvibeDaemon,
  openInIde,
  runExpressionViaDaemon,
  startRepl,
} from "./lib/daemonClient";
import {
  filterQueryHistory,
  recordHistoryEntry,
  type EvaluationHistoryEntry,
} from "./lib/history";
import {
  installBuiltinSnippetPack,
  installRemoteSnippetPack,
  installSnippetPackFromUrl,
} from "./lib/snippetPackInstall";
import { openNotebookFile, saveNotebookFile } from "./lib/notebook";
import { evaluateNotebookSource } from "./lib/notebookEvaluate";
import { openQueryFile, saveQueryFile } from "./lib/queryFile";
import { isQueryCancelledMessage } from "./lib/queryCancel";
import { runSqlViaDaemon } from "./lib/rawSql";
import { looksLikeRawSql } from "./lib/sqlDetect";
import { RUN_ALL_EVENT, RUN_QUERY_EVENT, RUN_PLAN_EVENT, normalizeExpression } from "./lib/editorRun";
import { appendQueryExpression } from "./lib/editorRunText";
import {
  hydrateWorkspaceSecrets,
  stripConnectionSecretsForSave,
  syncConnectionSecretToVault,
} from "./lib/connectionVault";
import { keybindingLabel, matchesKeybinding, resolveKeybindings } from "./lib/keybindings";
import { formatPrerequisitesStatus } from "./lib/prerequisitesStatus";
import { cycleQueryTabId } from "./lib/queryTabs";
import { normalizeQueryTabName } from "./lib/queryTabName";
import {
  addTabToPane,
  createSinglePaneLayout,
  dropTabOnPane,
  findPaneById,
  findPaneContainingTab,
  getFirstPaneId,
  migrateLegacySqlPaneOpen,
  normalizePaneLayout,
  removeTabFromLayout,
  setPaneActiveTab,
  setPaneSqlPaneOpen,
  setSplitRatio,
} from "./lib/queryPaneLayout";
import { buildExportContent } from "./lib/resultFormat";
import { inferResultEntity, persistResultChanges } from "./lib/resultPersist";
import { runScanJson } from "./lib/schema";
import { SampleWorkspaceDialog } from "./components/SampleWorkspaceDialog";
import {
  getSampleParentDirectory,
  provisionSampleWorkspace,
  sampleWorkspaceDetail,
} from "./lib/sampleWorkspace";
import { appendScriptLoad } from "./lib/scripts";
import { findingsToReviewItems } from "./lib/scan";
import { ensureWorkspaceFsScope } from "./lib/fsScope";
import { sourceFileLabel } from "./lib/sourceFile";
import {
  dismissScanFinding,
  getScanSessionDirectory,
  loadSavedNotesMap,
  saveScanFindingNote,
} from "./lib/scanSession";
import {
  getDefaultWorkspaceRoot,
  loadAppSettings,
  loadStudioSession,
  saveAppSettings,
  saveStudioSession,
} from "./lib/settings";
import { applyTheme, toggleTheme } from "./lib/theme";
import { useDebouncedEffect } from "./lib/debounce";
import { yieldToUi } from "./lib/yieldToUi";
import { formatStudioWindowTitle, setWindowTitle, STUDIO_WINDOW_TITLE } from "./lib/windowTitle";
import {
  createNewWorkspace,
  openWorkspaceFile,
  saveWorkspaceFile,
  workspaceDirectoryFromPath,
  type WorkspaceDocument,
} from "./lib/workspace";
import type { AppSettings, PrerequisiteCheckResult } from "./types/connection";
import { type EvaluationJsonPayload } from "./types/evaluation";
import { buildRunPaging, type RunPagingOptions } from "./lib/resultPaging";
import { resolveDisplayPayload } from "./lib/resultView";
import { createDefaultNotebook, createNotebookCell, type NotebookCell } from "./types/notebook";
import { resolveSavedMainView, type AppMainView } from "./types/mainView";
import {
  createQueryTab,
  createSourceTab,
  isSourceTab,
  restoreQueryTabFromSession,
  type QueryTab,
  type ResultsTab,
} from "./types/query";
import { createUserSnippet, type SnippetDefinition } from "./types/snippets";
import type { ScanMode, ScanReviewItem } from "./types/scan";
import type { PaneDropSide, PaneLayoutNode, TabDragPayload } from "./types/queryPaneLayout";
import {
  createEmptyQueryLibrary,
  createQueryFolder,
  type QueryLibraryState,
} from "./types/queryLibrary";
import {
  createSampleConnection,
  connectionDisplayName,
  duplicateConnection,
  getActiveConnection,
  resolveScriptSearchPath,
  resolveSearchDirectory,
  workspaceConnectionToSettings,
  type EfvibeWorkspace,
  type WorkspaceConnection,
} from "./types/workspace";
import "./theme.css";
import "./App.css";

function connectionForTab(
  workspace: EfvibeWorkspace,
  tab: QueryTab | undefined,
  fallbackConnectionId: string,
): WorkspaceConnection | undefined {
  if (!tab) {
    return getActiveConnection(workspace, fallbackConnectionId);
  }

  return (
    workspace.connections.find((connection) => connection.id === tab.connectionId) ??
    getActiveConnection(workspace, fallbackConnectionId)
  );
}

function focusTabInLayout(
  layout: PaneLayoutNode,
  tabId: string,
): { layout: PaneLayoutNode; focusedPaneId: string } | null {
  const pane = findPaneContainingTab(layout, tabId);
  if (!pane) {
    return null;
  }

  return {
    layout: setPaneActiveTab(layout, pane.id, tabId),
    focusedPaneId: pane.id,
  };
}

function App() {
  const [document, setDocument] = useState<WorkspaceDocument | undefined>();
  const [queryTabs, setQueryTabs] = useState<QueryTab[]>([]);
  const [paneLayout, setPaneLayout] = useState<PaneLayoutNode | null>(null);
  const [focusedPaneId, setFocusedPaneId] = useState("");
  const [settings, setSettings] = useState<AppSettings | undefined>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connectionEditorId, setConnectionEditorId] = useState<string | undefined>();
  const [prerequisites, setPrerequisites] = useState<PrerequisiteCheckResult>();
  const [prerequisitesLoading, setPrerequisitesLoading] = useState(true);
  const [status, setStatus] = useState("Ready");
  const [running, setRunning] = useState(false);
  const [engineBusyCount, setEngineBusyCount] = useState(0);
  const [sampleWorkspaceOfferOpen, setSampleWorkspaceOfferOpen] = useState(false);
  const [sampleWorkspaceCreating, setSampleWorkspaceCreating] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [renameTabRequest, setRenameTabRequest] = useState<QueryTabRenameRequest | undefined>();
  const keybindings = useMemo(
    () => resolveKeybindings(settings?.keybindings),
    [settings?.keybindings],
  );

  const vaultConnectionSecrets = settings?.vaultConnectionSecrets ?? true;
  const vaultEnabledRef = useRef<boolean | undefined>(undefined);
  const [resultsDockHeight, setResultsDockHeight] = useState(DEFAULT_RESULTS_DOCK_HEIGHT);
  const [explorerExpandedNodes, setExplorerExpandedNodes] = useState<string[]>(
    resolveExplorerExpandedNodes(),
  );
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [history, setHistory] = useState<EvaluationHistoryEntry[]>([]);
  const [mainView, setMainView] = useState<AppMainView>("query");
  const [replViewMounted, setReplViewMounted] = useState(false);
  const [diagramViewMounted, setDiagramViewMounted] = useState(false);
  const [diagramFocusRequest, setDiagramFocusRequest] = useState<{ dbSet?: string; nonce: number }>({
    nonce: 0,
  });
  const [notebookName, setNotebookName] = useState("Notebook");
  const [notebookPath, setNotebookPath] = useState("");
  const [notebookConnectionId, setNotebookConnectionId] = useState("");
  const [diagramConnectionId, setDiagramConnectionId] = useState("");
  const [notebookCells, setNotebookCells] = useState<NotebookCell[]>([]);
  const [notebookRunning, setNotebookRunning] = useState(false);
  const [runningNotebookCellId, setRunningNotebookCellId] = useState<string | undefined>();
  const [engineAllowed, setEngineAllowed] = useState(false);
  const [daemonConnectedIds, setDaemonConnectedIds] = useState<string[]>([]);
  const [sqlPaneWidth, setSqlPaneWidth] = useState(360);
  const [sqlPreviewAuto, setSqlPreviewAuto] = useState(false);
  const [editorToolPanelWidth, setEditorToolPanelWidth] = useState(DEFAULT_EDITOR_TOOL_PANEL_WIDTH);
  const [lambdaMode, setLambdaMode] = useState(false);
  const [userSnippets, setUserSnippets] = useState<SnippetDefinition[]>([]);
  const [queryLibrary, setQueryLibrary] = useState<QueryLibraryState>(createEmptyQueryLibrary());
  const [activeEditorTool, setActiveEditorTool] = useState<EditorToolId | undefined>();
  const [installedPackIds, setInstalledPackIds] = useState<string[]>([]);
  const [scanItems, setScanItems] = useState<ScanReviewItem[]>([]);
  const [scanIndex, setScanIndex] = useState(0);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | undefined>();
  const [splashExiting, setSplashExiting] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const splashMountRef = useRef(Date.now());
  const notebookCellsRef = useRef(notebookCells);
  const notebookRunGenerationRef = useRef(0);

  notebookCellsRef.current = notebookCells;

  const focusedPane = useMemo(() => {
    if (!paneLayout || !focusedPaneId) {
      return undefined;
    }

    return findPaneById(paneLayout, focusedPaneId);
  }, [paneLayout, focusedPaneId]);

  const activeQueryTabId = focusedPane?.activeTabId ?? "";

  const activeQueryTab = useMemo(
    () => queryTabs.find((tab) => tab.id === activeQueryTabId),
    [queryTabs, activeQueryTabId],
  );

  const activeConnectionId = useMemo(() => {
    if (activeQueryTab?.connectionId) {
      return activeQueryTab.connectionId;
    }

    if (queryTabs[0]?.connectionId) {
      return queryTabs[0].connectionId;
    }

    return document?.workspace.connections[0]?.id ?? "";
  }, [activeQueryTab, queryTabs, document]);

  const workspaceDirectory = useMemo(
    () => (document?.path ? workspaceDirectoryFromPath(document.path) : "."),
    [document?.path],
  );

  const activeConnection = useMemo(() => {
    if (!document) {
      return undefined;
    }

    return connectionForTab(document.workspace, activeQueryTab, activeConnectionId);
  }, [document, activeQueryTab, activeConnectionId]);

  const appReady = !!(
    settings &&
    document &&
    (!settings.onboardingCompleted || (activeConnection && activeQueryTab))
  );

  const connectionSettings = useMemo(() => {
    if (!activeConnection || !settings) {
      return undefined;
    }

    return workspaceConnectionToSettings(
      activeConnection,
      workspaceDirectory,
      settings.toolPath,
      settings.defaultWorkspaceRoot,
    );
  }, [activeConnection, settings, workspaceDirectory]);

  const searchDirectory = useMemo(() => {
    if (!activeConnection || !connectionSettings) {
      return workspaceDirectory !== "." ? workspaceDirectory : "";
    }

    return resolveSearchDirectory(
      activeConnection,
      workspaceDirectory,
      connectionSettings.project,
    );
  }, [activeConnection, connectionSettings, workspaceDirectory]);

  useEffect(() => {
    if (!document) {
      return;
    }

    void ensureWorkspaceFsScope(workspaceDirectory, document.workspace).catch((error) => {
      setStatus(error instanceof Error ? error.message : String(error));
    });
  }, [document, workspaceDirectory]);

  const notebookConnection = useMemo(() => {
    if (!document) {
      return undefined;
    }

    const connectionId = notebookConnectionId || activeConnectionId;
    if (!connectionId) {
      return undefined;
    }

    return getActiveConnection(document.workspace, connectionId);
  }, [document, notebookConnectionId, activeConnectionId]);

  const notebookConnectionSettings = useMemo(() => {
    if (!notebookConnection || !settings) {
      return undefined;
    }

    return workspaceConnectionToSettings(
      notebookConnection,
      workspaceDirectory,
      settings.toolPath,
      settings.defaultWorkspaceRoot,
    );
  }, [notebookConnection, settings, workspaceDirectory]);

  const notebookSearchDirectory = useMemo(() => {
    if (!notebookConnection || !notebookConnectionSettings) {
      return workspaceDirectory !== "." ? workspaceDirectory : "";
    }

    return resolveSearchDirectory(
      notebookConnection,
      workspaceDirectory,
      notebookConnectionSettings.project,
    );
  }, [notebookConnection, notebookConnectionSettings, workspaceDirectory]);

  const diagramConnection = useMemo(() => {
    if (!document) {
      return undefined;
    }

    const connectionId = diagramConnectionId || activeConnectionId;
    if (!connectionId) {
      return undefined;
    }

    return getActiveConnection(document.workspace, connectionId);
  }, [document, diagramConnectionId, activeConnectionId]);

  const diagramConnectionSettings = useMemo(() => {
    if (!diagramConnection || !settings) {
      return undefined;
    }

    return workspaceConnectionToSettings(
      diagramConnection,
      workspaceDirectory,
      settings.toolPath,
      settings.defaultWorkspaceRoot,
    );
  }, [diagramConnection, settings, workspaceDirectory]);

  const diagramSearchDirectory = useMemo(() => {
    if (!diagramConnection || !diagramConnectionSettings) {
      return workspaceDirectory !== "." ? workspaceDirectory : "";
    }

    return resolveSearchDirectory(
      diagramConnection,
      workspaceDirectory,
      diagramConnectionSettings.project,
    );
  }, [diagramConnection, diagramConnectionSettings, workspaceDirectory]);

  const effectiveNotebookConnectionId = notebookConnectionId || activeConnectionId;
  const effectiveDiagramConnectionId = diagramConnectionId || activeConnectionId;

  const payload = resolveDisplayPayload(activeQueryTab);

  const favoriteTabs = useMemo(
    () => queryTabs.filter((tab) => tab.favorite),
    [queryTabs],
  );

  const handleEditorTool = useCallback((tool: EditorToolId) => {
    setActiveEditorTool((current) => (current === tool ? undefined : tool));
  }, []);

  const updateQueryTab = useCallback((tabId: string, patch: Partial<QueryTab>) => {
    setQueryTabs((tabs) => tabs.map((tab) => (tab.id === tabId ? { ...tab, ...patch } : tab)));
  }, []);

  const handleExpressionChange = useCallback(
    (tabId: string, nextExpression: string) => {
      updateQueryTab(tabId, { expression: nextExpression });
    },
    [updateQueryTab],
  );

  const queryWorkspaceRefs = useRef(new Map<string, QueryWorkspaceHandle>());

  const updateWorkspace = useCallback((workspace: EfvibeWorkspace) => {
    setDocument((current) => (current ? { ...current, workspace } : current));
  }, []);

  const clearDaemonSession = useCallback(async () => {
    await invalidateEfvibeDaemon();
  }, []);

  const resetDaemonSessions = useCallback(async () => {
    await invalidateEfvibeDaemon();
    setEngineAllowed(false);
    setDaemonConnectedIds([]);
  }, []);

  const disconnectDaemonConnection = useCallback(async (connectionId: string) => {
    await invalidateEfvibeDaemon();
    setDaemonConnectedIds((current) => {
      const next = current.filter((id) => id !== connectionId);
      if (next.length === 0) {
        setEngineAllowed(false);
      }
      return next;
    });
  }, []);

  const allowEngine = useCallback(
    (connectionId?: string) => {
      const id = connectionId ?? activeConnectionId;
      if (!id) {
        return;
      }

      setEngineAllowed(true);
      setDaemonConnectedIds((current) =>
        current.includes(id) ? current : [...current, id],
      );
    },
    [activeConnectionId],
  );

  const applyWorkspaceUpdate = useCallback(
    (workspace: EfvibeWorkspace) => {
      updateWorkspace(workspace);
      setQueryTabs((tabs) =>
        tabs.map((tab) => {
          if (workspace.connections.some((connection) => connection.id === tab.connectionId)) {
            return tab;
          }

          const fallbackId = workspace.connections[0]?.id ?? tab.connectionId;
          return { ...tab, connectionId: fallbackId };
        }),
      );
      void resetDaemonSessions();
      setStatus(`Updated workspace ${workspace.name}`);
    },
    [resetDaemonSessions, updateWorkspace],
  );

  const adjustEngineBusy = useCallback((delta: number) => {
    setEngineBusyCount((count) => Math.max(0, count + delta));
  }, []);

  const runScan = useCallback(
    async (mode: ScanMode) => {
      if (!connectionSettings || !searchDirectory) {
        setScanError("Set search directory before scanning.");
        return;
      }

      setScanLoading(true);
      setScanError(undefined);
      adjustEngineBusy(1);
      await yieldToUi();
      try {
        const document = await runScanJson(connectionSettings, searchDirectory, searchDirectory, mode);
        if (!document) {
          setScanItems([]);
          setScanError("Scan returned no payload.");
          return;
        }
        const items = findingsToReviewItems(document, mode);
        const sessionDirectory = getScanSessionDirectory(connectionSettings, mode);
        const savedNotes = await loadSavedNotesMap(sessionDirectory);
        const itemsWithNotes = items.map((item) => {
          const savedNote = savedNotes[item.key];
          if (!savedNote) {
            return item;
          }

          return {
            ...item,
            finding: { ...item.finding, savedNote },
          };
        });
        setScanItems(itemsWithNotes);
        setScanIndex(0);
        if (items.length === 0) {
          setScanError("No findings reported.");
        }
      } catch (error) {
        setScanError(error instanceof Error ? error.message : String(error));
      } finally {
        adjustEngineBusy(-1);
        setScanLoading(false);
      }
    },
    [adjustEngineBusy, connectionSettings, searchDirectory],
  );

  const handleDismissScanFinding = useCallback(
    async (note?: string) => {
      if (!connectionSettings) {
        return;
      }

      const item = scanItems[scanIndex];
      if (!item) {
        return;
      }

      try {
        const sessionDirectory = getScanSessionDirectory(connectionSettings, item.scanMode);
        await dismissScanFinding(sessionDirectory, item.finding, note);
        setScanItems((items) => {
          const next = items.filter((_, index) => index !== scanIndex);
          setScanIndex((current) => Math.min(current, Math.max(0, next.length - 1)));
          return next;
        });
        setStatus(
          note?.trim()
            ? "Finding dismissed with note — it will be skipped in future scans."
            : "Finding dismissed — it will be skipped in future scans.",
        );
      } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error));
      }
    },
    [connectionSettings, scanIndex, scanItems],
  );

  const handleSaveScanFindingNote = useCallback(
    async (note: string) => {
      if (!connectionSettings) {
        return;
      }

      const item = scanItems[scanIndex];
      if (!item) {
        return;
      }

      try {
        const sessionDirectory = getScanSessionDirectory(connectionSettings, item.scanMode);
        await saveScanFindingNote(sessionDirectory, item.finding, note);
        setScanItems((items) =>
          items.map((entry, index) =>
            index === scanIndex
              ? { ...entry, finding: { ...entry.finding, savedNote: note.trim() } }
              : entry,
          ),
        );
        setStatus("Scan note saved.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error));
      }
    },
    [connectionSettings, scanIndex, scanItems],
  );

  const handleToggleTheme = useCallback(() => {
    setSettings((current) => {
      if (!current) {
        return current;
      }

      return { ...current, theme: toggleTheme(current.theme ?? "dark") };
    });
  }, []);

  const completeOnboarding = useCallback(async () => {
    if (!settings) {
      setSampleWorkspaceOfferOpen(false);
      return;
    }

    const nextSettings = { ...settings, onboardingCompleted: true };
    setSettings(nextSettings);
    await saveAppSettings(nextSettings);
    setSampleWorkspaceOfferOpen(false);
  }, [settings]);

  const handleDeclineSampleWorkspace = useCallback(() => {
    if (document && document.workspace.connections.length === 0) {
      const connection = createSampleConnection();
      const tab = createQueryTab(connection.id);
      setDocument({
        path: document.path,
        workspace: {
          ...document.workspace,
          connections: [connection],
        },
      });
      setQueryTabs([tab]);
      const layout = createSinglePaneLayout([tab.id], tab.id);
      setPaneLayout(layout);
      setFocusedPaneId(layout.id);
    }

    void completeOnboarding();
  }, [completeOnboarding, document]);

  const handleCreateSampleWorkspace = useCallback(async () => {
    if (!settings || sampleWorkspaceCreating) {
      return;
    }

    setSampleWorkspaceCreating(true);
    setStatus("Downloading AdventureWorks SQLite sample…");
    await yieldToUi();

    try {
      const sample = await provisionSampleWorkspace(settings.defaultWorkspaceRoot);
      await invalidateEfvibeDaemon();

      setDocument({
        path: sample.workspacePath,
        workspace: sample.workspace,
      });
      setQueryTabs(sample.queryTabs);
      setPaneLayout(sample.paneLayout);
      setFocusedPaneId(sample.paneLayout.id);
      setNotebookName(sample.notebookName);
      setNotebookPath(sample.notebookPath);
      setNotebookConnectionId(sample.connectionId);
      setNotebookCells(sample.notebookCells);
      setMainView("query");
      setExplorerExpandedNodes(
        normalizeExplorerExpandedNodes(
          resolveExplorerExpandedNodes(undefined, undefined),
          sample.connectionId,
        ),
      );

      const nextSettings = { ...settings, onboardingCompleted: true };
      setSettings(nextSettings);
      await saveAppSettings(nextSettings);
      setSampleWorkspaceOfferOpen(false);
      setStatus(`Sample workspace ready in ${sample.studioRoot}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setSampleWorkspaceCreating(false);
    }
  }, [sampleWorkspaceCreating, settings]);

  const sampleWorkspaceTargetDetail = useMemo(() => {
    if (!settings?.defaultWorkspaceRoot) {
      return undefined;
    }

    return sampleWorkspaceDetail(
      `${getSampleParentDirectory(settings.defaultWorkspaceRoot)}/AdventureWorks-sqlite`,
    );
  }, [settings?.defaultWorkspaceRoot]);

  useEffect(() => {
    void (async () => {
      const loaded = await loadAppSettings();
      const home = await homeDir();
      if (!loaded.defaultWorkspaceRoot) {
        loaded.defaultWorkspaceRoot = getDefaultWorkspaceRoot(home);
      }

      const savedSession = await loadStudioSession();
      if (savedSession?.workspacePath || savedSession?.workspace.connections.length) {
        loaded.onboardingCompleted = true;
      }

      if (savedSession?.workspace.connections.length) {
        const hydratedWorkspace = await hydrateWorkspaceSecrets(
          savedSession.workspacePath,
          savedSession.workspace,
        );
        setDocument({
          path: savedSession.workspacePath,
          workspace: hydratedWorkspace,
        });
        const connectionId =
          savedSession.workspace.connections.find(
            (connection) => connection.id === savedSession.activeConnectionId,
          )?.id ?? savedSession.workspace.connections[0].id;

        if (savedSession.queryTabs?.length) {
          const restoredTabs = savedSession.queryTabs.map(restoreQueryTabFromSession);
          setQueryTabs(restoredTabs);
          const tabIds = restoredTabs.map((tab) => tab.id);
          const activeId = savedSession.queryTabs.some(
            (tab) => tab.id === savedSession.activeQueryTabId,
          )
            ? savedSession.activeQueryTabId
            : restoredTabs[0].id;
          const layout = migrateLegacySqlPaneOpen(
            savedSession.paneLayout
              ? normalizePaneLayout(savedSession.paneLayout, tabIds, activeId)
              : createSinglePaneLayout(tabIds, activeId),
            savedSession.sqlPaneOpen ?? (savedSession.liveSqlEnabled ? true : undefined),
          );
          setPaneLayout(layout);
          setFocusedPaneId(
            savedSession.focusedPaneId &&
              findPaneById(layout, savedSession.focusedPaneId)
              ? savedSession.focusedPaneId
              : (findPaneContainingTab(layout, activeId)?.id ?? getFirstPaneId(layout)),
          );
        } else {
          const tab = createQueryTab(connectionId, {
            expression: (savedSession as { expression?: string }).expression,
          });
          setQueryTabs([tab]);
          const layout = createSinglePaneLayout([tab.id], tab.id);
          setPaneLayout(layout);
          setFocusedPaneId(layout.id);
        }

        if (savedSession.resultsDockHeight) {
          setResultsDockHeight(savedSession.resultsDockHeight);
        }
        setExplorerExpandedNodes(
          normalizeExplorerExpandedNodes(
            resolveExplorerExpandedNodes(
              savedSession.explorerExpandedNodes,
              savedSession.sidebarTab,
            ),
            connectionId,
          ),
        );
        if (savedSession.history) {
          setHistory(filterQueryHistory(savedSession.history));
        }
        const restoredMainView = resolveSavedMainView(savedSession);
        setMainView(restoredMainView);
        if (restoredMainView === "repl") {
          setReplViewMounted(true);
        }
        if (restoredMainView === "diagram") {
          setDiagramViewMounted(true);
        }
        if (restoredMainView === "notebook" || savedSession.notebookCells?.length) {
          setNotebookName(savedSession.notebookName ?? "Notebook");
          setNotebookPath(savedSession.notebookPath ?? "");
          setNotebookConnectionId(savedSession.notebookConnectionId ?? connectionId);
          setDiagramConnectionId(savedSession.diagramConnectionId ?? connectionId);
          setNotebookCells(savedSession.notebookCells ?? createDefaultNotebook(connectionId));
        }
        if (savedSession.sqlPaneWidth) {
          setSqlPaneWidth(savedSession.sqlPaneWidth);
        }
        if (savedSession.sqlPreviewAuto !== undefined) {
          setSqlPreviewAuto(savedSession.sqlPreviewAuto);
        }
        if (savedSession.editorToolPanelWidth) {
          setEditorToolPanelWidth(savedSession.editorToolPanelWidth);
        }
        if (savedSession.lambdaMode) {
          setLambdaMode(savedSession.lambdaMode);
        }
        if (savedSession.userSnippets) {
          setUserSnippets(savedSession.userSnippets);
        }
        if (savedSession.queryLibrary) {
          setQueryLibrary(savedSession.queryLibrary);
        }
        if (savedSession.installedPackIds) {
          setInstalledPackIds(savedSession.installedPackIds);
        }
        if (savedSession.explorerOpen !== undefined) {
          setExplorerOpen(savedSession.explorerOpen);
        }
      } else if (loaded.onboardingCompleted) {
        const connection = createSampleConnection();
        const tab = createQueryTab(connection.id);
        setDocument({
          path: "",
          workspace: {
            version: 1,
            name: "Untitled workspace",
            projects: [],
            connections: [connection],
          },
        });
        setQueryTabs([tab]);
        const layout = createSinglePaneLayout([tab.id], tab.id);
        setPaneLayout(layout);
        setFocusedPaneId(layout.id);
      } else {
        setDocument({
          path: "",
          workspace: {
            version: 1,
            name: "Untitled workspace",
            projects: [],
            connections: [],
          },
        });
        setQueryTabs([]);
        setPaneLayout(null);
        setFocusedPaneId("");
      }

      if (!loaded.onboardingCompleted) {
        setSampleWorkspaceOfferOpen(true);
      }

      setSettings(loaded);
      applyTheme(loaded.theme ?? "dark");
      setSessionLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!queryTabs.length || paneLayout) {
      return;
    }

    const layout = createSinglePaneLayout(
      queryTabs.map((tab) => tab.id),
      queryTabs[0].id,
    );
    setPaneLayout(layout);
    setFocusedPaneId(layout.id);
  }, [queryTabs, paneLayout]);

  useEffect(() => {
    if (!appReady || splashDone) {
      return;
    }

    const minimumSplashMs = 1400;
    const elapsed = Date.now() - splashMountRef.current;
    const delay = Math.max(0, minimumSplashMs - elapsed);

    const timer = window.setTimeout(() => {
      setSplashExiting(true);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [appReady, splashDone]);

  useEffect(() => {
    if (!splashExiting) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSplashDone(true);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [splashExiting]);

  useEffect(() => {
    if (!settings?.theme) {
      return;
    }

    applyTheme(settings.theme);
  }, [settings?.theme]);

  useDebouncedEffect(
    () => {
      if (!settings) {
        return;
      }

      void saveAppSettings(settings);
    },
    [settings],
    500,
  );

  useDebouncedEffect(
    () => {
      if (!sessionLoaded || !document || !settings?.onboardingCompleted) {
        return;
      }

      void saveStudioSession({
        workspacePath: document.path,
        workspace: vaultConnectionSecrets
          ? stripConnectionSecretsForSave(document.workspace)
          : document.workspace,
        activeConnectionId,
        queryTabs,
        activeQueryTabId,
        paneLayout: paneLayout ?? undefined,
        focusedPaneId,
        resultsDockHeight,
        explorerExpandedNodes,
        history,
        mainView,
        notebookName,
        notebookPath,
        notebookConnectionId,
        diagramConnectionId,
        notebookCells,
        liveSqlEnabled: focusedPane?.sqlPaneOpen ?? false,
        sqlPaneOpen: focusedPane?.sqlPaneOpen ?? false,
        sqlPaneWidth,
        sqlPreviewAuto,
        editorToolPanelWidth,
        lambdaMode,
        userSnippets,
        queryLibrary,
        installedPackIds,
        explorerOpen,
      });
    },
    [
      sessionLoaded,
      settings?.onboardingCompleted,
      document,
      activeConnectionId,
      queryTabs,
      activeQueryTabId,
      paneLayout,
      focusedPaneId,
      resultsDockHeight,
      explorerExpandedNodes,
      history,
      mainView,
      notebookName,
      notebookPath,
      notebookConnectionId,
      diagramConnectionId,
      notebookCells,
      focusedPane?.sqlPaneOpen,
      sqlPaneWidth,
      sqlPreviewAuto,
      editorToolPanelWidth,
      lambdaMode,
      userSnippets,
      queryLibrary,
      installedPackIds,
      explorerOpen,
      vaultConnectionSecrets,
    ],
    800,
  );

  const toggleExplorer = useCallback(() => {
    setExplorerOpen((open) => !open);
  }, []);

  const handleSaveQuery = useCallback(async () => {
    if (!activeQueryTab || isSourceTab(activeQueryTab)) {
      return;
    }

    try {
      const saved = await saveQueryFile(activeQueryTab, activeConnectionId);
      updateQueryTab(activeQueryTab.id, saved);
      setStatus(`Saved ${saved.filePath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message !== "Save cancelled.") {
        setStatus(`Save failed: ${message}`);
      }
    }
  }, [activeConnectionId, activeQueryTab, updateQueryTab]);

  useEffect(() => {
    const title = activeConnection
      ? formatStudioWindowTitle(connectionDisplayName(activeConnection))
      : STUDIO_WINDOW_TITLE;
    void setWindowTitle(title).catch((error) => {
      console.error("Failed to set window title:", error);
    });
  }, [activeConnection]);

  useEffect(() => {
    if (!document) {
      return;
    }

    const enabled = vaultConnectionSecrets;
    const wasEnabled = vaultEnabledRef.current;
    vaultEnabledRef.current = enabled;
    if (!enabled || wasEnabled === enabled) {
      return;
    }

    void (async () => {
      for (const connection of document.workspace.connections) {
        await syncConnectionSecretToVault(document.path, connection, true);
      }
    })();
  }, [document, vaultConnectionSecrets]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (matchesKeybinding(event, keybindings.toggleExplorer)) {
        event.preventDefault();
        toggleExplorer();
        return;
      }

      if (matchesKeybinding(event, keybindings.saveQuery)) {
        event.preventDefault();
        void handleSaveQuery();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSaveQuery, keybindings.saveQuery, keybindings.toggleExplorer, toggleExplorer]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || mainView !== "query") {
        return;
      }

      if (matchesKeybinding(event, keybindings.newQueryTab)) {
        if (!document) {
          return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        addQueryTab();
        return;
      }

      if (event.key === "F2" && activeQueryTabId) {
        event.preventDefault();
        event.stopImmediatePropagation();
        requestRenameQueryTab(activeQueryTabId);
        return;
      }

      if (matchesKeybinding(event, keybindings.closeQueryTab)) {
        if (queryTabs.length <= 1 || !activeQueryTabId) {
          return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        closeQueryTab(activeQueryTabId);
        return;
      }

      const paneTabIds = focusedPane?.tabIds ?? [];
      if (paneTabIds.length <= 1) {
        return;
      }

      let direction: 1 | -1 | undefined;
      if (matchesKeybinding(event, keybindings.nextQueryTab)) {
        direction = 1;
      } else if (matchesKeybinding(event, keybindings.previousQueryTab)) {
        direction = -1;
      } else {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const paneTabs = queryTabs.filter((tab) => paneTabIds.includes(tab.id));
      const nextId = cycleQueryTabId(paneTabs, activeQueryTabId, direction);
      if (!nextId || nextId === activeQueryTabId || !paneLayout || !focusedPaneId) {
        return;
      }

      setPaneLayout(setPaneActiveTab(paneLayout, focusedPaneId, nextId));
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [
    activeConnectionId,
    activeQueryTabId,
    document,
    focusedPane,
    focusedPaneId,
    keybindings.newQueryTab,
    keybindings.closeQueryTab,
    keybindings.nextQueryTab,
    keybindings.previousQueryTab,
    mainView,
    paneLayout,
    queryTabs,
  ]);

  useEffect(() => {
    if (!settings) {
      return;
    }

    let cancelled = false;
    const loadingTimer = window.setTimeout(() => {
      if (!cancelled) {
        setPrerequisitesLoading(true);
      }
    }, 300);

    void (async () => {
      try {
        const result = await checkPrerequisites(
          searchDirectory || ".",
          settings.toolPath,
          activeConnection?.dotnetFramework ?? "",
        );
        if (!cancelled) {
          setPrerequisites(result);
        }
      } finally {
        window.clearTimeout(loadingTimer);
        if (!cancelled) {
          setPrerequisitesLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(loadingTimer);
    };
  }, [settings, searchDirectory, activeConnection?.dotnetFramework]);

  const handleRun = useCallback(
    async (
      withPlan = false,
      expressionOverride?: string,
      paneId = focusedPaneId,
      pagingOptions?: RunPagingOptions,
    ) => {
      if (!settings || !document || !paneLayout) {
        setStatus("Configure a connection before running.");
        return;
      }

      const pane = findPaneById(paneLayout, paneId);
      const tab = queryTabs.find((item) => item.id === pane?.activeTabId);
      if (!tab) {
        return;
      }

      if (isSourceTab(tab)) {
        return;
      }

      const paneConnection = connectionForTab(document.workspace, tab, activeConnectionId);
      if (!paneConnection) {
        setStatus("Configure a connection before running.");
        return;
      }

      const paneConnectionSettings = workspaceConnectionToSettings(
        paneConnection,
        workspaceDirectory,
        settings.toolPath,
        settings.defaultWorkspaceRoot,
      );
      const paneSearchDirectory = resolveSearchDirectory(
        paneConnection,
        workspaceDirectory,
        paneConnectionSettings.project,
      );

      setFocusedPaneId(paneId);
      queryWorkspaceRefs.current.get(paneId)?.flush();
      const editorText = queryWorkspaceRefs.current.get(paneId)?.getDraft() ?? tab.expression;
      const isPageNavigation = pagingOptions?.pageNavigation === true;
      const editorSnapshot = isPageNavigation
        ? (tab.lastRunExpression ?? editorText.trim())
        : editorText.trim();
      const runInput = (
        expressionOverride ??
        queryWorkspaceRefs.current.get(paneId)?.getRunText() ??
        editorText
      ).trim();
      if (!runInput) {
        return;
      }

      const resultPageIndex = pagingOptions?.pageIndex ?? 0;
      const runPaging = buildRunPaging(pagingOptions);

      if (looksLikeRawSql(runInput)) {
        allowEngine(tab.connectionId);

        if (!paneSearchDirectory) {
          const errorPayload: EvaluationJsonPayload = {
            success: false,
            sql: [runInput],
            metrics: { totalMs: 0, sqlCommandCount: 0, resultKind: "error" },
            warnings: [],
            error:
              "Set a search directory or EF project in Settings so efvibe can discover your .csproj.",
          };
          updateQueryTab(tab.id, {
            lastPayload: errorPayload,
            activeResultsTab: "result",
          });
          setStatus("Set a search directory or EF project in Settings.");
          return;
        }

        setRunning(true);
        setStatus(withPlan ? "Running SQL with plan…" : "Running SQL…");
        await yieldToUi();

        try {
          const result = await runSqlViaDaemon(
            paneConnectionSettings,
            paneSearchDirectory,
            paneSearchDirectory,
            runInput,
            withPlan,
            runPaging,
          );

          if (result.payload) {
            const nextTab: ResultsTab = withPlan ? "plan" : "result";
            updateQueryTab(tab.id, {
              lastPayload: result.payload,
              lastRunExpression: editorSnapshot,
              resultPageIndex,
              activeResultsTab: nextTab,
              resultRowsBaseline: result.payload.rows
                ? result.payload.rows.map((row) => ({ ...row }))
                : undefined,
              resultEntity: undefined,
            });

            if (result.payload.success) {
              setHistory((current) =>
                recordHistoryEntry(
                  current,
                  runInput,
                  result.payload!,
                  paneConnection.name ?? "Connection",
                ),
              );
            }

            setStatus(
              result.payload.success
                ? `SQL done · ${result.payload.metrics.totalMs} ms`
                : result.payload.error ?? "SQL execution failed.",
            );
          }
        } catch (error) {
          let message = error instanceof Error ? error.message : String(error);
          if (isQueryCancelledMessage(message)) {
            setStatus("Query cancelled.");
            return;
          }
          if (/unknown request type/i.test(message) && /executesql/i.test(message)) {
            message =
              "Raw SQL requires a recent efvibe build with executeSql support. Update the tool in Settings or rebuild the engine.";
          }
          updateQueryTab(tab.id, {
            lastPayload: {
              success: false,
              sql: [runInput],
              metrics: { totalMs: 0, sqlCommandCount: 0, resultKind: "error" },
              warnings: [],
              error: message,
            },
            lastRunExpression: editorSnapshot,
            activeResultsTab: "messages",
          });
          setStatus(message);
        } finally {
          setRunning(false);
        }

        return;
      }

      const runExpression = normalizeExpression(runInput, lambdaMode);

      if (!paneSearchDirectory) {
        const errorPayload: EvaluationJsonPayload = {
          success: false,
          sql: [],
          metrics: { totalMs: 0, sqlCommandCount: 0, resultKind: "error" },
          warnings: [],
          error:
            "Set a search directory or EF project in Settings so efvibe can discover your .csproj.",
        };
        updateQueryTab(tab.id, {
          lastPayload: errorPayload,
          activeResultsTab: "result",
        });
        setStatus("Set a search directory or EF project in Settings.");
        return;
      }

      allowEngine(tab.connectionId);
      setRunning(true);
      setStatus(withPlan ? "Running with plan…" : "Running…");
      await yieldToUi();

      try {
        const result = await runExpressionViaDaemon(
          paneConnectionSettings,
          paneSearchDirectory,
          paneSearchDirectory,
          runExpression,
          withPlan,
          runPaging,
        );

        if (result.payload) {
          const nextTab: ResultsTab = withPlan ? "plan" : "result";

          updateQueryTab(tab.id, {
            lastPayload: result.payload,
            expression: isPageNavigation ? tab.expression : editorText,
            lastRunExpression: editorSnapshot,
            resultPageIndex,
            activeResultsTab: nextTab,
            resultRowsBaseline: result.payload.rows
              ? result.payload.rows.map((row) => ({ ...row }))
              : undefined,
            resultEntity:
              result.payload.rows && result.payload.rows.length > 0
                ? inferResultEntity(runExpression)
                : undefined,
          });

          if (result.payload.success) {
            setHistory((current) =>
              recordHistoryEntry(
                current,
                runExpression,
                result.payload!,
                paneConnection.name ?? "Connection",
              ),
            );
          }

          setStatus(
            result.payload.success
              ? (result.payload.compareResults?.length ?? 0) >= 2
                ? `Compared ${result.payload.compareResults!.length} variants · ${result.payload.metrics.totalMs} ms (last)`
                : result.payload.benchmarkResult
                  ? `Benchmarked ${result.payload.benchmarkResult.iterations} runs · avg ${result.payload.benchmarkResult.averageMs} ms`
                  : `Done · ${result.payload.metrics.totalMs} ms`
              : result.payload.error ?? "Evaluation failed.",
          );
        } else {
          updateQueryTab(tab.id, {
            lastPayload: {
              success: false,
              sql: [],
              metrics: { totalMs: 0, sqlCommandCount: 0, resultKind: "error" },
              warnings: [],
              error: result.stdout || "No evaluation payload returned.",
            },
            expression: editorText,
            lastRunExpression: editorSnapshot,
            activeResultsTab: "messages",
          });
          setStatus("Evaluation failed.");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isQueryCancelledMessage(message)) {
          setStatus("Query cancelled.");
          return;
        }
        updateQueryTab(tab.id, {
          lastPayload: {
            success: false,
            sql: [],
            metrics: { totalMs: 0, sqlCommandCount: 0, resultKind: "error" },
            warnings: [],
            error: message,
          },
          expression: editorText,
          lastRunExpression: editorSnapshot,
          activeResultsTab: "messages",
        });
        setStatus(message);
      } finally {
        setRunning(false);
      }
    },
    [
      settings,
      document,
      paneLayout,
      queryTabs,
      activeConnectionId,
      focusedPaneId,
      updateQueryTab,
      lambdaMode,
      allowEngine,
      workspaceDirectory,
    ],
  );

  const handleStopQuery = useCallback(() => {
    void cancelEfvibeDaemonRequest();
    setStatus("Stopping query…");
  }, []);

  const handleRunAll = useCallback(
    (paneId = focusedPaneId) => {
      const pane = paneLayout ? findPaneById(paneLayout, paneId) : undefined;
      const tab = queryTabs.find((item) => item.id === pane?.activeTabId);
      if (tab && isSourceTab(tab)) {
        return;
      }

      queryWorkspaceRefs.current.get(paneId)?.flush();
      const fullText =
        queryWorkspaceRefs.current.get(paneId)?.getDraft() ?? tab?.expression ?? "";
      void handleRun(false, fullText, paneId);
    },
    [focusedPaneId, handleRun, paneLayout, queryTabs],
  );

  const handleRunLine = useCallback(
    (paneId = focusedPaneId) => {
      void handleRun(false, undefined, paneId);
    },
    [focusedPaneId, handleRun],
  );

  useEffect(() => {
    const listener = () => {
      void handleRunAll();
    };

    window.addEventListener(RUN_ALL_EVENT, listener);
    return () => window.removeEventListener(RUN_ALL_EVENT, listener);
  }, [handleRunAll]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || mainView !== "query") {
        return;
      }

      if (matchesKeybinding(event, keybindings.runAll)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        void handleRunAll();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [handleRunAll, keybindings.runAll, mainView]);

  useEffect(() => {
    const listener = () => {
      void handleRunLine();
    };

    window.addEventListener(RUN_QUERY_EVENT, listener);
    return () => window.removeEventListener(RUN_QUERY_EVENT, listener);
  }, [handleRunLine]);

  useEffect(() => {
    const listener = () => {
      void handleRun(true);
    };

    window.addEventListener(RUN_PLAN_EVENT, listener);
    return () => window.removeEventListener(RUN_PLAN_EVENT, listener);
  }, [handleRun]);

  function selectQueryTab(tabId: string, paneId = focusedPaneId) {
    if (!paneLayout) {
      return;
    }

    setPaneLayout(setPaneActiveTab(paneLayout, paneId, tabId));
    setFocusedPaneId(paneId);
  }

  function addQueryTab(paneId = focusedPaneId) {
    if (!document) {
      return;
    }

    const tab = createQueryTab(activeConnectionId, {
      name: `Query ${queryTabs.length + 1}`,
    });
    setQueryTabs((tabs) => [...tabs, tab]);
    if (paneLayout) {
      const next = addTabToPane(paneLayout, paneId, tab.id);
      setPaneLayout(next.layout);
      setFocusedPaneId(next.focusedPaneId);
    }
  }

  function closeQueryTab(tabId: string) {
    if (queryTabs.length <= 1 || !paneLayout) {
      return;
    }

    setQueryTabs((tabs) => tabs.filter((tab) => tab.id !== tabId));
    const next = removeTabFromLayout(paneLayout, tabId);
    if (next.layout) {
      setPaneLayout(next.layout);
      setFocusedPaneId(next.focusedPaneId ?? getFirstPaneId(next.layout));
    }
  }

  async function handleOpenQuery() {
    try {
      const opened = await openQueryFile();
      if (!opened || !document) {
        return;
      }

      if (
        !document.workspace.connections.some(
          (connection) => connection.id === opened.connectionId,
        )
      ) {
        opened.connectionId = activeConnectionId;
      }

      setQueryTabs((tabs) => [...tabs, opened]);
      if (paneLayout) {
        const next = addTabToPane(paneLayout, focusedPaneId, opened.id);
        setPaneLayout(next.layout);
        setFocusedPaneId(next.focusedPaneId);
      }
      setStatus(`Opened ${opened.name}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleOpenWorkspace() {
    try {
      const opened = await openWorkspaceFile();
      if (!opened) {
        return;
      }

      const hydratedWorkspace = await hydrateWorkspaceSecrets(opened.path, opened.workspace);
      setDocument({
        path: opened.path,
        workspace: hydratedWorkspace,
      });
      const connectionId = opened.workspace.connections[0]?.id ?? "";
      const tab = createQueryTab(connectionId);
      setQueryTabs([tab]);
      const layout = createSinglePaneLayout([tab.id], tab.id);
      setPaneLayout(layout);
      setFocusedPaneId(layout.id);
      await resetDaemonSessions();
      setStatus(`Opened ${hydratedWorkspace.name}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSaveWorkspace() {
    if (!document) {
      return;
    }

    try {
      const saved = await saveWorkspaceFile(document, {
        stripConnectionSecrets: vaultConnectionSecrets,
      });
      setDocument(saved);
      setStatus(`Saved ${saved.path}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message !== "Save cancelled.") {
        setStatus(`Save failed: ${message}`);
      }
    }
  }

  async function handleNewWorkspace() {
    const created = await createNewWorkspace();
    created.workspace.connections = [createSampleConnection()];
    const connection = created.workspace.connections[0];
    const tab = createQueryTab(connection.id);
    setDocument(created);
    setQueryTabs([tab]);
    const layout = createSinglePaneLayout([tab.id], tab.id);
    setPaneLayout(layout);
    setFocusedPaneId(layout.id);
    await resetDaemonSessions();
    setStatus("New workspace");
  }

  async function handleExport(format: "csv" | "json") {
    const content = buildExportContent(payload, format);
    if (!content) {
      setStatus("Nothing to export from the last result.");
      return;
    }

    const target = await save({
      filters: [{ name: format.toUpperCase(), extensions: [format] }],
      defaultPath: `myefvibe-export.${format}`,
    });

    if (!target || Array.isArray(target)) {
      return;
    }

    await writeTextFile(target, content);
    setStatus(`Exported to ${target}`);
  }

  function handleReplSessionExit(exitCode: number) {
    setMainView("query");
    setReplViewMounted(false);
    setStatus(exitCode === 0 ? "REPL session ended." : `REPL exited with code ${exitCode}.`);
  }

  function handleMainViewChange(view: AppMainView) {
    if (view === mainView) {
      return;
    }

    setMainView(view);
    if (view === "repl") {
      setReplViewMounted(true);
    }
    if (view === "diagram") {
      setDiagramViewMounted(true);
      if (!diagramConnectionId) {
        setDiagramConnectionId(activeConnectionId);
      }
    }
    if (view === "notebook" && notebookCells.length === 0) {
      setNotebookCells(createDefaultNotebook(activeConnectionId));
      setNotebookConnectionId(activeConnectionId);
    }
  }

  const handleOpenErDiagram = useCallback((dbSet?: string) => {
    setDiagramViewMounted(true);
    setDiagramConnectionId((current) => current || activeConnectionId);
    setMainView("diagram");
    setDiagramFocusRequest((previous) => ({ dbSet, nonce: previous.nonce + 1 }));
  }, [activeConnectionId]);

  async function handleStartRepl() {
    if (!connectionSettings || !searchDirectory) {
      setStatus("Configure a connection before starting REPL.");
      return;
    }

    try {
      await startRepl(connectionSettings, searchDirectory, searchDirectory);
      setStatus("Started efvibe REPL in terminal.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleGoToSource(file: string, line: number) {
    if (!settings) {
      return;
    }

    try {
      await openInIde(file, line, settings.preferredEditor, settings.customEditorCommand);
      setStatus(`Opened ${file}:${line}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  const handleOpenSourceTab = useCallback(
    (filePath: string, line: number, connectionId = activeConnectionId) => {
      if (!document || !paneLayout || !connectionId.trim()) {
        setStatus("Configure a connection before opening source.");
        return;
      }

      setMainView("query");

      const existing = queryTabs.find(
        (tab) => isSourceTab(tab) && tab.sourceFilePath === filePath,
      );

      if (existing) {
        const name = `${sourceFileLabel(filePath)}:${line}`;
        updateQueryTab(existing.id, { sourceLine: line, name });
        const focused = focusTabInLayout(paneLayout, existing.id);
        if (focused) {
          setPaneLayout(focused.layout);
          setFocusedPaneId(focused.focusedPaneId);
        }
        setStatus(`Opened ${name}`);
        return;
      }

      const tab = createSourceTab(connectionId, filePath, line);
      setQueryTabs((tabs) => [...tabs, tab]);
      const next = addTabToPane(paneLayout, focusedPaneId, tab.id);
      setPaneLayout(next.layout);
      setFocusedPaneId(next.focusedPaneId);
      setStatus(`Opened ${tab.name}`);
    },
    [activeConnectionId, document, focusedPaneId, paneLayout, queryTabs, updateQueryTab],
  );

  function updateConnection(connection: WorkspaceConnection) {
    if (!document) {
      return;
    }

    void (async () => {
      const synced = await syncConnectionSecretToVault(
        document.path,
        connection,
        vaultConnectionSecrets,
      );

      updateWorkspace({
        ...document.workspace,
        connections: document.workspace.connections.map((entry) =>
          entry.id === connection.id ? synced : entry,
        ),
      });
      await resetDaemonSessions();
    })();
  }

  const handleScriptLoadsChange = useCallback(
    (scriptLoads: string[]) => {
      if (!document) {
        return;
      }

      const connection = connectionForTab(document.workspace, activeQueryTab, activeConnectionId);
      if (!connection) {
        return;
      }

      updateConnection({
        ...connection,
        scriptLoads,
      });
    },
    [document, activeQueryTab, activeConnectionId],
  );

  const handleScriptUsingsChange = useCallback(
    (scriptUsings: string[]) => {
      if (!document) {
        return;
      }

      const connection = connectionForTab(document.workspace, activeQueryTab, activeConnectionId);
      if (!connection) {
        return;
      }

      updateConnection({
        ...connection,
        scriptUsings,
      });
    },
    [document, activeQueryTab, activeConnectionId],
  );

  const handleScriptCreated = useCallback(
    (fileName: string) => {
      if (!document) {
        return;
      }

      const connection = connectionForTab(document.workspace, activeQueryTab, activeConnectionId);
      if (!connection) {
        return;
      }

      const nextLoads = appendScriptLoad(connection.scriptLoads ?? [], fileName);
      if (nextLoads.length === (connection.scriptLoads ?? []).length) {
        return;
      }

      handleScriptLoadsChange(nextLoads);
    },
    [document, activeQueryTab, activeConnectionId, handleScriptLoadsChange],
  );

  async function handleOpenNotebook() {
    const opened = await openNotebookFile(activeConnectionId);
    if (!opened) {
      return;
    }

    setMainView("notebook");
    setNotebookName(opened.name);
    setNotebookPath(opened.path);
    setNotebookConnectionId(opened.connectionId);
    setNotebookCells(opened.cells);
    setStatus(`Opened notebook ${opened.name}`);
  }

  async function handleSaveNotebook(options?: { saveAs?: boolean }) {
    try {
      const savedPath = await saveNotebookFile(
        notebookName,
        notebookPath,
        effectiveNotebookConnectionId,
        notebookCells,
        options,
      );
      setNotebookPath(savedPath);
      setStatus(
        options?.saveAs ? `Saved notebook as ${savedPath}` : `Saved notebook ${savedPath}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message !== "Save cancelled.") {
        setStatus(`Notebook save failed: ${message}`);
      }
    }
  }

  async function handleRunNotebook() {
    if (!notebookConnectionSettings || !settings || !document) {
      setStatus("Configure a connection before running the notebook.");
      return;
    }

    setNotebookRunning(true);
    await yieldToUi();
    const batchRunId = ++notebookRunGenerationRef.current;
    try {
      for (const cell of notebookCellsRef.current) {
        if (cell.kind !== "code" || !cell.value.trim()) {
          continue;
        }

        await runNotebookCell(cell.id, {
          quiet: true,
          runId: batchRunId,
        });
      }
      setStatus("Notebook run complete.");
    } finally {
      setNotebookRunning(false);
      if (batchRunId === notebookRunGenerationRef.current) {
        setRunningNotebookCellId(undefined);
      }
    }
  }

  const updateNotebookCell = useCallback((cellId: string, patch: Partial<NotebookCell>) => {
    setNotebookCells((cells) =>
      cells.map((cell) => (cell.id === cellId ? { ...cell, ...patch } : cell)),
    );
  }, []);

  async function runNotebookCell(
    cellId: string,
    options?: { quiet?: boolean; runId?: number; source?: string },
  ) {
    const runId = options?.runId ?? ++notebookRunGenerationRef.current;
    const cell = notebookCellsRef.current.find((entry) => entry.id === cellId);
    if (!cell || cell.kind !== "code") {
      return;
    }

    const source = (options?.source ?? cell.value).trim();
    if (!source) {
      return;
    }

    if (!notebookConnectionSettings || !settings || !document) {
      setStatus("Configure a connection before running.");
      return;
    }

    allowEngine(notebookConnectionId || activeConnectionId);
    setRunningNotebookCellId(cellId);
    updateNotebookCell(cellId, {
      executionStatus: "running",
      lastPayload: undefined,
      markdownOutput: undefined,
      activeResultsTab: undefined,
    });
    if (!options?.quiet) {
      setStatus("Running cell…");
    }
    await yieldToUi();

    try {
      const result = await evaluateNotebookSource(
        source,
        notebookConnectionSettings,
        notebookSearchDirectory,
        notebookSearchDirectory,
        false,
      );

      if (runId !== notebookRunGenerationRef.current) {
        return;
      }

      updateNotebookCell(cellId, {
        lastPayload: result.payload,
        activeResultsTab: result.activeResultsTab,
        markdownOutput: result.markdownOutput,
        executionStatus: result.payload.success ? "success" : "error",
      });

      if (!options?.quiet) {
        setStatus(
          result.payload.success
            ? `Cell done · ${result.payload.metrics.totalMs} ms`
            : result.payload.error ?? "Cell evaluation failed.",
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (runId !== notebookRunGenerationRef.current) {
        return;
      }

      if (isQueryCancelledMessage(message)) {
        updateNotebookCell(cellId, { executionStatus: "idle" });
        if (!options?.quiet) {
          setStatus("Query cancelled.");
        }
        return;
      }

      updateNotebookCell(cellId, {
        lastPayload: {
          success: false,
          sql: [],
          metrics: { totalMs: 0, sqlCommandCount: 0, resultKind: "error" },
          warnings: [],
          error: message,
        },
        activeResultsTab: "messages",
        markdownOutput: undefined,
        executionStatus: "error",
      });

      if (!options?.quiet) {
        setStatus(message);
      }
    } finally {
      if (runId === notebookRunGenerationRef.current) {
        setRunningNotebookCellId(undefined);
      }
    }
  }

  function handleRunNotebookCell(
    cellId: string,
    scope: NotebookRunScope = "cell",
    source?: string,
  ) {
    void runNotebookCells(cellId, scope, source);
  }

  async function runNotebookCells(
    cellId: string,
    scope: NotebookRunScope,
    sourceOverride?: string,
  ) {
    if (!notebookConnectionSettings || !settings || !document) {
      setStatus("Configure a connection before running.");
      return;
    }

    const cells = notebookCellsRef.current;
    const index = cells.findIndex((entry) => entry.id === cellId);
    if (index < 0) {
      return;
    }

    const targets = cells.filter((cell, cellIndex) => {
      if (cell.kind !== "code" || !cell.value.trim()) {
        return false;
      }

      if (scope === "cell") {
        return cell.id === cellId;
      }

      if (scope === "above") {
        return cellIndex < index;
      }

      return cellIndex > index;
    });

    if (targets.length === 0) {
      setStatus(
        scope === "cell"
          ? "Nothing to run in this cell."
          : `No code cells ${scope} this cell.`,
      );
      return;
    }

    const batchRunId = ++notebookRunGenerationRef.current;

    if (targets.length === 1 && scope === "cell") {
      await runNotebookCell(targets[0]!.id, { source: sourceOverride, runId: batchRunId });
      return;
    }

    setNotebookRunning(true);
    await yieldToUi();
    try {
      for (const cell of targets) {
        const source = cell.id === cellId ? sourceOverride : undefined;
        await runNotebookCell(cell.id, { quiet: true, runId: batchRunId, source });
      }
      setStatus(`Ran ${targets.length} cells.`);
    } finally {
      setNotebookRunning(false);
      if (batchRunId === notebookRunGenerationRef.current) {
        setRunningNotebookCellId(undefined);
      }
    }
  }

  function handleInsertNotebookCell(cellId: string, position: "above" | "below") {
    setNotebookCells((cells) => {
      const index = cells.findIndex((cell) => cell.id === cellId);
      if (index < 0) {
        return cells;
      }

      const insertAt = position === "above" ? index : index + 1;
      const next = [...cells];
      next.splice(insertAt, 0, createNotebookCell(cells[index].kind));
      return next;
    });
  }

  function handleMoveNotebookCell(cellId: string, direction: "up" | "down") {
    setNotebookCells((cells) => {
      const index = cells.findIndex((cell) => cell.id === cellId);
      if (index < 0) {
        return cells;
      }

      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= cells.length) {
        return cells;
      }

      const next = [...cells];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleToggleFavorite(tabId: string) {
    setQueryTabs((tabs) =>
      tabs.map((tab) =>
        tab.id === tabId ? { ...tab, favorite: !tab.favorite } : tab,
      ),
    );
  }

  const handleRenameQueryTab = useCallback(
    (tabId: string, name: string) => {
      setQueryTabs((tabs) => {
        const tab = tabs.find((entry) => entry.id === tabId);

        if (!tab) {
          return tabs;
        }

        return tabs.map((entry) =>
          entry.id === tabId
            ? { ...entry, name: normalizeQueryTabName(name, entry.name) }
            : entry,
        );
      });
    },
    [],
  );

  function requestRenameQueryTab(tabId: string) {
    setRenameTabRequest({ tabId, nonce: Date.now() });
  }

  function handleOpenQueryInNewTab(expression: string, connectionId: string, name?: string) {
    const tab = createQueryTab(connectionId, {
      expression,
      name: name ?? `Query ${queryTabs.length + 1}`,
    });
    setQueryTabs((tabs) => [...tabs, tab]);
    if (paneLayout) {
      const next = addTabToPane(paneLayout, focusedPaneId, tab.id);
      setPaneLayout(next.layout);
      setFocusedPaneId(next.focusedPaneId);
    }
  }

  function handleOpenLibraryQuery(expression: string, connectionId: string, name?: string) {
    if (!document) {
      return;
    }

    const existing = queryTabs.find(
      (tab) => tab.expression === expression && tab.connectionId === connectionId,
    );
    if (existing && paneLayout) {
      const focused = focusTabInLayout(paneLayout, existing.id);
      if (focused) {
        setPaneLayout(focused.layout);
        setFocusedPaneId(focused.focusedPaneId);
      }
      return;
    }

    const tab = createQueryTab(connectionId, { expression, name });
    setQueryTabs((tabs) => [...tabs, tab]);
    if (paneLayout) {
      const next = addTabToPane(paneLayout, focusedPaneId, tab.id);
      setPaneLayout(next.layout);
      setFocusedPaneId(next.focusedPaneId);
    }
  }

  function handleInsertSnippet(expression: string) {
    if (!activeQueryTab) {
      return;
    }

    updateQueryTab(activeQueryTab.id, { expression });
  }

  const handleHistorySelect = useCallback(
    (nextExpression: string) => {
      if (!activeQueryTab) {
        return;
      }

      queryWorkspaceRefs.current.get(focusedPaneId)?.flush();
      const current =
        queryWorkspaceRefs.current.get(focusedPaneId)?.getDraft() ?? activeQueryTab.expression;

      updateQueryTab(activeQueryTab.id, {
        expression: appendQueryExpression(current, nextExpression),
      });
    },
    [activeQueryTab, focusedPaneId, updateQueryTab],
  );

  function handleAddSnippet(title: string, expression: string) {
    setUserSnippets((snippets) => [...snippets, createUserSnippet(title, expression)]);
  }

  function handleRemoveSnippet(id: string) {
    setUserSnippets((snippets) => snippets.filter((snippet) => snippet.id !== id));
  }

  function handleImportPack(
    snippets: SnippetDefinition[],
    queries: Array<{ name: string; expression: string; connectionId: string }>,
    folderNames: string[],
  ) {
    setUserSnippets((current) => [...current, ...snippets]);

    if (folderNames.length > 0) {
      setQueryLibrary((library) => ({
        ...library,
        folders: [
          ...library.folders,
          ...folderNames
            .filter((name) => !library.folders.some((folder) => folder.name === name))
            .map((name) => createQueryFolder(name)),
        ],
      }));
    }

    for (const query of queries) {
      handleOpenLibraryQuery(query.expression, query.connectionId, query.name);
    }
  }

  function handleInstallPackId(packId: string) {
    setInstalledPackIds((current) =>
      current.includes(packId) ? current : [...current, packId],
    );
  }

  const snippetPackCallbacks = {
    onImportPack: handleImportPack,
    onInstallPackId: handleInstallPackId,
    onStatus: setStatus,
  };

  async function handleInstallBuiltinPack(packId: string) {
    await installBuiltinSnippetPack(packId, activeConnectionId, snippetPackCallbacks);
  }

  async function handleInstallRemotePack(packId: string) {
    await installRemoteSnippetPack(packId, activeConnectionId, snippetPackCallbacks);
  }

  async function handleInstallSnippetPackFromUrl(url: string) {
    await installSnippetPackFromUrl(url, activeConnectionId, snippetPackCallbacks);
  }

  const connectionEditorConnection =
    document && connectionEditorId
      ? document.workspace.connections.find((connection) => connection.id === connectionEditorId)
      : undefined;

  const handleQueryTabConnectionChange = useCallback(
    (connectionId: string) => {
      if (!activeQueryTab) {
        return;
      }

      updateQueryTab(activeQueryTab.id, { connectionId });
      void clearDaemonSession();
    },
    [activeQueryTab, clearDaemonSession, updateQueryTab],
  );

  const showBusyOverlay =
    running || notebookRunning || engineBusyCount > 0;

  const busyMessage =
    running || notebookRunning ? status : "Working with efvibe…";

  const statusBarMessage = useMemo(() => {
    if (prerequisitesLoading) {
      return "Checking .NET SDK and efvibe…";
    }

    if (prerequisites && !prerequisites.ok) {
      return formatPrerequisitesStatus(prerequisites);
    }

    return status;
  }, [prerequisites, prerequisitesLoading, status]);

  const handleTabDrop = useCallback(
    (payload: TabDragPayload, targetPaneId: string, side: PaneDropSide) => {
      if (!paneLayout) {
        return;
      }

      const next = dropTabOnPane(
        paneLayout,
        payload.tabId,
        payload.sourcePaneId,
        targetPaneId,
        side,
      );
      if (next) {
        setPaneLayout(next.layout);
        setFocusedPaneId(next.focusedPaneId);
      }
    },
    [paneLayout],
  );

  if (!splashDone) {
    const splashMessage = appReady ? "Opening workspace…" : "Loading workspace…";
    return (
      <>
        <SplashScreen message={splashMessage} exiting={splashExiting} />
        <SampleWorkspaceDialog
          open={sampleWorkspaceOfferOpen}
          busy={sampleWorkspaceCreating}
          detail={sampleWorkspaceTargetDetail}
          onConfirm={() => void handleCreateSampleWorkspace()}
          onClose={handleDeclineSampleWorkspace}
        />
      </>
    );
  }

  if (!appReady) {
    return <SplashScreen message="Loading workspace…" />;
  }

  return (
    <main className="app">
      <TabDragController onDrop={handleTabDrop} />
      <header className="topbar">
        <button
          type="button"
          className={`topbar-icon-btn explorer-toggle-btn${explorerOpen ? " active" : ""}`}
          title={`${explorerOpen ? "Hide" : "Show"} explorer (${keybindingLabel(keybindings.toggleExplorer)})`}
          aria-label={`${explorerOpen ? "Hide" : "Show"} explorer`}
          aria-pressed={explorerOpen}
          onClick={toggleExplorer}
        >
          <IconSidebar />
        </button>
        <MainViewSwitcher value={mainView} onChange={handleMainViewChange} />
        <div
          className="status-bar"
          role="status"
          aria-live="polite"
          aria-busy={showBusyOverlay}
          title={showBusyOverlay ? busyMessage : statusBarMessage}
        >
          {showBusyOverlay ? (
            <StatusBarBusy message={busyMessage} />
          ) : (
            <span className="status-bar-text">{statusBarMessage}</span>
          )}
        </div>
      </header>

      <div className={explorerOpen ? "workspace" : "workspace explorer-hidden"}>
        {explorerOpen ? (
        <ExplorerSidebar
          workspace={document.workspace}
          documentPath={document.path}
          workspaceDirectory={workspaceDirectory}
          appSettings={settings}
          workspaceName={document.workspace.name}
          expandedNodeIds={explorerExpandedNodes}
          onExpandedNodeIdsChange={setExplorerExpandedNodes}
          connections={document.workspace.connections}
          activeConnectionId={activeConnectionId}
          daemonConnectedIds={daemonConnectedIds}
          history={history}
          queryTabs={queryTabs}
          queryLibrary={queryLibrary}
          userSnippets={userSnippets}
          teamSyncDirectory={settings.teamSyncDirectory}
          cloudSyncDirectory={settings.cloudSyncDirectory ?? ""}
          onSelectConnection={(connectionId) => {
            if (activeQueryTab) {
              updateQueryTab(activeQueryTab.id, { connectionId });
            }
            void clearDaemonSession();
          }}
          onAddConnection={() => {
            const connection = createSampleConnection(
              `Connection ${document.workspace.connections.length + 1}`,
            );
            updateWorkspace({
              ...document.workspace,
              connections: [...document.workspace.connections, connection],
            });
            if (activeQueryTab) {
              updateQueryTab(activeQueryTab.id, { connectionId: connection.id });
            }
            setConnectionEditorId(connection.id);
          }}
          onDuplicateConnection={(connectionId) => {
            const source = document.workspace.connections.find(
              (connection) => connection.id === connectionId,
            );
            if (!source) {
              return;
            }

            const copy = duplicateConnection(source);
            updateWorkspace({
              ...document.workspace,
              connections: [...document.workspace.connections, copy],
            });
            if (activeQueryTab) {
              updateQueryTab(activeQueryTab.id, { connectionId: copy.id });
            }
          }}
          onRefreshConnection={(connectionId) => {
            const connection = document.workspace.connections.find(
              (entry) => entry.id === connectionId,
            );
            if (!connection) {
              return;
            }

            void (async () => {
              await disconnectDaemonConnection(connectionId);
              setStatus(`Refreshed ${connectionDisplayName(connection)}`);
            })();
          }}
          onRebuildConnection={(connectionId) => {
            if (!settings) {
              return;
            }

            const connection = document.workspace.connections.find(
              (entry) => entry.id === connectionId,
            );
            if (!connection) {
              return;
            }

            const rebuildSettings = workspaceConnectionToSettings(
              connection,
              workspaceDirectory,
              settings.toolPath,
              settings.defaultWorkspaceRoot,
            );
            const rebuildSearchDirectory = resolveSearchDirectory(
              connection,
              workspaceDirectory,
              rebuildSettings.project,
            );

            if (!rebuildSearchDirectory) {
              setStatus("Set a search directory or EF project before rebuilding.");
              return;
            }

            const rebuildCwd =
              workspaceDirectory && workspaceDirectory !== "."
                ? workspaceDirectory
                : rebuildSearchDirectory;

            void (async () => {
              allowEngine(connectionId);
              adjustEngineBusy(1);
              setStatus(`Rebuilding EF projects for ${connectionDisplayName(connection)}…`);
              await yieldToUi();

              try {
                await rebuildEfvibeDaemon(
                  rebuildSettings,
                  rebuildSearchDirectory,
                  rebuildCwd,
                );
                setStatus(`Rebuilt EF projects for ${connectionDisplayName(connection)}.`);
              } catch (error) {
                setStatus(
                  error instanceof Error
                    ? error.message
                    : `Rebuild failed for ${connectionDisplayName(connection)}.`,
                );
              } finally {
                adjustEngineBusy(-1);
              }
            })();
          }}
          onDisconnectConnection={(connectionId) => {
            if (connectionId !== activeConnectionId) {
              return;
            }

            const connection = document.workspace.connections.find(
              (entry) => entry.id === connectionId,
            );
            if (!connection) {
              return;
            }

            void (async () => {
              await disconnectDaemonConnection(connectionId);
              setStatus(`Disconnected from ${connectionDisplayName(connection)}.`);
            })();
          }}
          onDeleteConnection={(connectionId) => {
            const remaining = document.workspace.connections.filter(
              (connection) => connection.id !== connectionId,
            );
            if (remaining.length === 0) {
              return;
            }

            updateWorkspace({ ...document.workspace, connections: remaining });
            const nextId = remaining[0].id;
            setQueryTabs((tabs) =>
              tabs.map((tab) =>
                tab.connectionId === connectionId ? { ...tab, connectionId: nextId } : tab,
              ),
            );
            setDaemonConnectedIds((current) => current.filter((id) => id !== connectionId));
            if (diagramConnectionId === connectionId) {
              setDiagramConnectionId(nextId);
            }
            if (notebookConnectionId === connectionId) {
              setNotebookConnectionId(nextId);
            }
          }}
          onEditConnection={(connectionId) => {
            setConnectionEditorId(connectionId);
          }}
          onOpenQueryTab={handleOpenQueryInNewTab}
          onHistorySelect={handleHistorySelect}
          onOpenLibraryQuery={handleOpenLibraryQuery}
          onInsertSnippet={handleInsertSnippet}
          onRemoveSnippet={handleRemoveSnippet}
          onImportPack={handleImportPack}
          onStatus={setStatus}
          onNewWorkspace={() => void handleNewWorkspace()}
          onOpenWorkspace={() => void handleOpenWorkspace()}
          onSaveWorkspace={() => void handleSaveWorkspace()}
          onRenameWorkspace={(name) => {
            updateWorkspace({ ...document.workspace, name });
            setStatus(`Renamed workspace to ${name}`);
          }}
          onUpdateWorkspace={applyWorkspaceUpdate}
          onOpenSettings={() => setSettingsOpen(true)}
          prerequisites={prerequisites}
          prerequisitesLoading={prerequisitesLoading}
          aboutSearchDirectory={searchDirectory || workspaceDirectory}
          aboutToolPath={settings.toolPath}
          aboutDotnetFramework={activeConnection?.dotnetFramework ?? ""}
          onRequestEngine={allowEngine}
          onEngineBusyChange={adjustEngineBusy}
          onOpenErDiagram={handleOpenErDiagram}
          theme={settings.theme ?? "dark"}
          onToggleTheme={handleToggleTheme}
        />
        ) : null}

        <div className="main-stack">
          {mainView === "query" ? (
            <>
              <div className="editor-shell">
                <EditorToolRail
                  activeTool={activeEditorTool}
                  onSelect={handleEditorTool}
                />

                {activeEditorTool ? (
                  <ResizableEditorToolPanel
                    width={editorToolPanelWidth}
                    onWidthChange={setEditorToolPanelWidth}
                  >
                    <EditorToolPanel
                      tool={activeEditorTool}
                      history={history}
                      userSnippets={userSnippets}
                      favoriteTabs={favoriteTabs}
                      scanItems={scanItems}
                      scanIndex={scanIndex}
                      scanLoading={scanLoading}
                      scanError={scanError}
                      theme={settings.theme ?? "dark"}
                      onClose={() => setActiveEditorTool(undefined)}
                      onHistorySelect={handleHistorySelect}
                      onInsertSnippet={handleInsertSnippet}
                      onAddSnippet={handleAddSnippet}
                      onRemoveSnippet={handleRemoveSnippet}
                      installedPackIds={installedPackIds}
                      onInstallBuiltinPack={(packId) => void handleInstallBuiltinPack(packId)}
                      onInstallRemotePack={(packId) => void handleInstallRemotePack(packId)}
                      onInstallPackFromUrl={handleInstallSnippetPackFromUrl}
                      onOpenFavorite={(tab) => selectQueryTab(tab.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onRunScan={(mode) => void runScan(mode)}
                      onScanIndexChange={setScanIndex}
                      onOpenSourceTab={(file, line) => handleOpenSourceTab(file, line)}
                      onGoToSource={(file, line) => void handleGoToSource(file, line)}
                      onRunQuery={(expression) => {
                        if (!activeQueryTab) {
                          return;
                        }

                        updateQueryTab(activeQueryTab.id, { expression });
                        void handleRun(false, expression);
                      }}
                      onDismissFinding={(note) => void handleDismissScanFinding(note)}
                      onSaveFindingNote={(note) => void handleSaveScanFindingNote(note)}
                      running={running}
                      scriptSearchPath={
                        activeConnection
                          ? resolveScriptSearchPath(activeConnection, workspaceDirectory)
                          : ""
                      }
                      scriptLoads={activeConnection?.scriptLoads ?? []}
                      scriptUsings={activeConnection?.scriptUsings ?? []}
                      onScriptsChanged={() => void resetDaemonSessions()}
                      onScriptCreated={handleScriptCreated}
                      onScriptLoadsChange={handleScriptLoadsChange}
                      onScriptUsingsChange={handleScriptUsingsChange}
                    />
                  </ResizableEditorToolPanel>
                ) : null}

                <div className="editor-shell-main">
                  {paneLayout ? (
                    <QueryPaneLayout
                      layout={paneLayout}
                      focusedPaneId={focusedPaneId}
                      onSplitRatioChange={(splitId, ratio) => {
                        setPaneLayout((current) =>
                          current ? setSplitRatio(current, splitId, ratio) : current,
                        );
                      }}
                      onFocusedPaneChange={setFocusedPaneId}
                      renderLeaf={(pane) => {
                        const paneTabs = queryTabs.filter((tab) => pane.tabIds.includes(tab.id));
                        const paneTab = queryTabs.find((tab) => tab.id === pane.activeTabId);
                        if (!paneTab) {
                          return (
                            <div className="query-pane-empty">
                              <p className="muted">No query tab in this pane.</p>
                              <button type="button" onClick={() => addQueryTab(pane.id)}>
                                New query tab
                              </button>
                            </div>
                          );
                        }

                        const paneConnection = connectionForTab(
                          document.workspace,
                          paneTab,
                          activeConnectionId,
                        );
                        if (!paneConnection) {
                          return (
                            <div className="query-pane-empty">
                              <p className="muted">Configure a connection for this query tab.</p>
                            </div>
                          );
                        }

                        const paneConnectionSettings = workspaceConnectionToSettings(
                          paneConnection,
                          workspaceDirectory,
                          settings.toolPath,
                          settings.defaultWorkspaceRoot,
                        );
                        const paneSearchDirectory = resolveSearchDirectory(
                          paneConnection,
                          workspaceDirectory,
                          paneConnectionSettings.project,
                        );
                        const panePayload = resolveDisplayPayload(paneTab);
                        const paneResultsTab = paneTab.activeResultsTab ?? "result";
                        const paneIsSource = isSourceTab(paneTab);

                        return (
                          <>
                            <QueryTabBar
                              paneId={pane.id}
                              tabs={paneTabs}
                              activeTabId={pane.activeTabId}
                              renameTabRequest={
                                focusedPaneId === pane.id ? renameTabRequest : undefined
                              }
                              onSelect={(tabId) => selectQueryTab(tabId, pane.id)}
                              onAdd={() => addQueryTab(pane.id)}
                              onClose={closeQueryTab}
                              onOpen={() => void handleOpenQuery()}
                              onSave={() => void handleSaveQuery()}
                              onToggleFavorite={handleToggleFavorite}
                              onRename={handleRenameQueryTab}
                            />

                            {paneIsSource ? (
                              <SourceTabWorkspace
                                filePath={paneTab.sourceFilePath}
                                line={paneTab.sourceLine ?? 1}
                                theme={settings.theme ?? "dark"}
                              />
                            ) : (
                              <>
                            <QueryTabToolbar
                              connections={document.workspace.connections}
                              connectionId={paneTab.connectionId}
                              onConnectionChange={handleQueryTabConnectionChange}
                              running={running}
                              runAllShortcutLabel={keybindingLabel(keybindings.runAll)}
                              runLineShortcutLabel={keybindingLabel(keybindings.runQuery)}
                              onRunAll={() => void handleRunAll(pane.id)}
                              onRunLine={() => void handleRunLine(pane.id)}
                              onRunPlan={() => void handleRun(true, undefined, pane.id)}
                              onStop={handleStopQuery}
                            />

                            <ResizableResultsDock
                              height={resultsDockHeight}
                              onHeightChange={setResultsDockHeight}
                              editor={
                                <QueryWorkspace
                                  ref={(handle) => {
                                    if (handle) {
                                      queryWorkspaceRefs.current.set(pane.id, handle);
                                    } else {
                                      queryWorkspaceRefs.current.delete(pane.id);
                                    }
                                  }}
                                  tabId={paneTab.id}
                                  expression={paneTab.expression}
                                  theme={settings.theme ?? "dark"}
                                  onExpressionChange={handleExpressionChange}
                                  sqlPaneOpen={pane.sqlPaneOpen ?? false}
                                  onSqlPaneOpenChange={(open) => {
                                    setPaneLayout((current) =>
                                      current ? setPaneSqlPaneOpen(current, pane.id, open) : current,
                                    );
                                  }}
                                  sqlPaneWidth={sqlPaneWidth}
                                  onSqlPaneWidthChange={setSqlPaneWidth}
                                  sqlPreviewAuto={sqlPreviewAuto}
                                  onSqlPreviewAutoChange={setSqlPreviewAuto}
                                  connectionSettings={paneConnectionSettings}
                                  searchDirectory={paneSearchDirectory}
                                  autoPreviewAllowed={engineAllowed}
                                  running={running}
                                  onEngineBusyChange={adjustEngineBusy}
                                  onRequestEngine={allowEngine}
                                  onRun={(text) => void handleRun(false, text, pane.id)}
                                  keybindings={keybindings}
                                />
                              }
                              results={
                                <ResultsTabs
                                  payload={panePayload}
                                  activeTab={paneResultsTab}
                                  onTabChange={(tab) =>
                                    updateQueryTab(paneTab.id, { activeResultsTab: tab })
                                  }
                                  onExport={(format) => void handleExport(format)}
                                  pagingLoading={running}
                                  onPageChange={(pageIndex) => {
                                    if (!paneTab.lastRunExpression) {
                                      return;
                                    }

                                    void handleRun(false, paneTab.lastRunExpression, pane.id, {
                                      pageIndex,
                                      pageNavigation: true,
                                    });
                                  }}
                                  onSaveRows={async (rows) => {
                                    if (
                                      !paneConnectionSettings ||
                                      !paneSearchDirectory ||
                                      !paneTab.lastPayload
                                    ) {
                                      const message =
                                        "Configure a connection before saving result changes.";
                                      setStatus(message);
                                      throw new Error(message);
                                    }

                                    const baseline = paneTab.resultRowsBaseline;
                                    const entity = paneTab.resultEntity;

                                    if (!baseline || !entity) {
                                      const message =
                                        "These results cannot be saved to the database. Run a DbSet LINQ query (for example db.Products.Take(10).ToList()) that returns entity rows with primary keys.";
                                      setStatus(message);
                                      throw new Error(message);
                                    }

                                    try {
                                      const message = await persistResultChanges(
                                        paneConnectionSettings,
                                        paneSearchDirectory,
                                        paneSearchDirectory,
                                        entity,
                                        baseline,
                                        rows,
                                      );

                                      updateQueryTab(paneTab.id, {
                                        lastPayload: {
                                          ...paneTab.lastPayload,
                                          rows: rows.map((row) => ({ ...row })),
                                          metrics: {
                                            ...paneTab.lastPayload.metrics,
                                            rowCount: rows.length,
                                          },
                                        },
                                        resultRowsBaseline: rows.map((row) => ({ ...row })),
                                      });
                                      setStatus(message);
                                    } catch (error) {
                                      const message =
                                        error instanceof Error ? error.message : String(error);
                                      setStatus(message);
                                      throw error;
                                    }
                                  }}
                                />
                              }
                            />
                              </>
                            )}
                          </>
                        );
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </>
          ) : null}

          {diagramViewMounted && diagramConnectionSettings && diagramConnection ? (
            <div
              className={
                mainView === "diagram" ? "main-view-slot" : "main-view-slot main-view-hidden"
              }
            >
              <ErDiagramView
                connections={document.workspace.connections}
                connectionId={effectiveDiagramConnectionId}
                onConnectionChange={setDiagramConnectionId}
                connectionName={connectionDisplayName(diagramConnection)}
                connectionSettings={diagramConnectionSettings}
                searchDirectory={diagramSearchDirectory}
                theme={settings.theme ?? "dark"}
                focusRequest={diagramFocusRequest}
                onStatus={setStatus}
                onRequestEngine={allowEngine}
                onEngineBusyChange={adjustEngineBusy}
              />
            </div>
          ) : null}

          {mainView === "notebook" ? (
            <NotebookView
              connections={document.workspace.connections}
              connectionId={effectiveNotebookConnectionId}
              onConnectionChange={setNotebookConnectionId}
              name={notebookName}
              cells={notebookCells}
              theme={settings?.theme ?? "dark"}
              running={notebookRunning}
              runningCellId={runningNotebookCellId}
              onNameChange={setNotebookName}
              onCellChange={(cellId, value) =>
                setNotebookCells((cells) =>
                  cells.map((cell) =>
                    cell.id === cellId
                      ? {
                          ...cell,
                          value,
                          executionStatus: "idle",
                          lastPayload: undefined,
                          markdownOutput: undefined,
                          activeResultsTab: undefined,
                        }
                      : cell,
                  ),
                )
              }
              onAddCell={(kind) =>
                setNotebookCells((cells) => [...cells, createNotebookCell(kind)])
              }
              onInsertCell={handleInsertNotebookCell}
              onRemoveCell={(cellId) =>
                setNotebookCells((cells) => cells.filter((cell) => cell.id !== cellId))
              }
              onMoveCell={handleMoveNotebookCell}
              onOpen={() => void handleOpenNotebook()}
              onSave={() => void handleSaveNotebook()}
              onSaveAs={() => void handleSaveNotebook({ saveAs: true })}
              onRunAll={() => void handleRunNotebook()}
              onRunCell={handleRunNotebookCell}
            />
          ) : null}

          {replViewMounted ? (
            <div
              className={
                mainView === "repl" ? "main-view-slot" : "main-view-slot main-view-hidden"
              }
            >
              <ReplView
                connectionSettings={connectionSettings}
                searchDirectory={searchDirectory}
                theme={settings.theme ?? "dark"}
                active={mainView === "repl"}
                onStatus={setStatus}
                onOpenExternalTerminal={() => void handleStartRepl()}
                onSessionExit={handleReplSessionExit}
              />
            </div>
          ) : null}
        </div>
      </div>

      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSettingsChange={setSettings}
      />

      {connectionEditorConnection ? (
        <ConnectionPanel
          open
          connection={connectionEditorConnection}
          workspacePath={document?.path ?? ""}
          vaultConnectionSecrets={vaultConnectionSecrets}
          onClose={() => setConnectionEditorId(undefined)}
          onConnectionChange={updateConnection}
        />
      ) : null}

      <SampleWorkspaceDialog
        open={sampleWorkspaceOfferOpen}
        busy={sampleWorkspaceCreating}
        detail={sampleWorkspaceTargetDetail}
        onConfirm={() => void handleCreateSampleWorkspace()}
        onClose={handleDeclineSampleWorkspace}
      />

    </main>
  );
}

export default App;
