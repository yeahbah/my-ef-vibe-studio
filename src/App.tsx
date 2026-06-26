import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { homeDir } from "@tauri-apps/api/path";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { ConnectionPicker } from "./components/ConnectionPicker";
import { SplashScreen } from "./components/SplashScreen";
import { StatusBarBusy } from "./components/StatusBarBusy";
import { ErDiagramView } from "./components/ErDiagramView";
import { EditorToolPanel } from "./components/EditorToolPanel";
import { EditorToolRail, type EditorToolId } from "./components/EditorToolRail";
import { MainViewSwitcher } from "./components/MainViewSwitcher";
import { NotebookView } from "./components/NotebookView";
import { QueryWorkspace, type QueryWorkspaceHandle } from "./components/QueryWorkspace";
import { ReplView } from "./components/ReplView";
import { PrerequisitesBanner } from "./components/PrerequisitesBanner";
import { QueryTabBar } from "./components/QueryTabBar";
import { ResizableResultsDock, DEFAULT_RESULTS_DOCK_HEIGHT } from "./components/ResizableResultsDock";
import {
  ResizableEditorToolPanel,
  DEFAULT_EDITOR_TOOL_PANEL_WIDTH,
} from "./components/ResizableEditorToolPanel";
import { ResultsTabs } from "./components/ResultsTabs";
import { ConnectionPanel } from "./components/ConnectionPanel";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { SettingsPanel } from "./components/SettingsPanel";
import { ExplorerSidebar } from "./components/explorer/ExplorerSidebar";
import { resolveExplorerExpandedNodes, normalizeExplorerExpandedNodes } from "./components/explorer/types";
import { runBenchmark, type BenchmarkResult } from "./lib/benchmark";
import {
  cancelEfvibeDaemonRequest,
  checkPrerequisites,
  invalidateEfvibeDaemon,
  rebuildEfvibeDaemon,
  openInIde,
  runExpressionViaDaemon,
  startRepl,
} from "./lib/daemonClient";
import { recordHistoryEntry, type EvaluationHistoryEntry } from "./lib/history";
import { openNotebookFile, saveNotebookFile } from "./lib/notebook";
import { openQueryFile, saveQueryFile } from "./lib/queryFile";
import { isQueryCancelledMessage } from "./lib/queryCancel";
import { runSqlViaDaemon } from "./lib/rawSql";
import { looksLikeRawSql } from "./lib/sqlDetect";
import { RUN_QUERY_EVENT, RUN_PLAN_EVENT } from "./lib/editorRun";
import {
  hydrateWorkspaceSecrets,
  stripConnectionSecretsForSave,
  syncConnectionSecretToVault,
} from "./lib/connectionVault";
import { matchesKeybinding, resolveKeybindings } from "./lib/keybindings";
import { buildExportContent } from "./lib/resultFormat";
import { inferResultEntity, persistResultChanges } from "./lib/resultPersist";
import { runScanJson } from "./lib/schema";
import { findingsToReviewItems } from "./lib/scan";
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
import { emptyEvaluationPayload, type EvaluationJsonPayload } from "./types/evaluation";
import { createDefaultNotebook, type NotebookCell } from "./types/notebook";
import { resolveSavedMainView, type AppMainView } from "./types/mainView";
import { createQueryTab, normalizeResultsTab, type LegacyResultsTab, type QueryTab, type ResultsTab } from "./types/query";
import { createUserSnippet, type SnippetDefinition } from "./types/snippets";
import type { ScanMode, ScanReviewItem } from "./types/scan";
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
  resolveSearchDirectory,
  workspaceConnectionToSettings,
  type EfvibeWorkspace,
  type WorkspaceConnection,
} from "./types/workspace";
import "./theme.css";
import "./App.css";

function normalizeExpression(expression: string, lambdaMode: boolean): string {
  const trimmed = expression.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (lambdaMode) {
    return trimmed.replace(/;+\s*$/u, "");
  }

  return trimmed.endsWith(";") ? trimmed : `${trimmed};`;
}

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

function App() {
  const [document, setDocument] = useState<WorkspaceDocument | undefined>();
  const [queryTabs, setQueryTabs] = useState<QueryTab[]>([]);
  const [activeQueryTabId, setActiveQueryTabId] = useState("");
  const [activeConnectionId, setActiveConnectionId] = useState("");
  const [settings, setSettings] = useState<AppSettings | undefined>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connectionEditorId, setConnectionEditorId] = useState<string | undefined>();
  const [prerequisites, setPrerequisites] = useState<PrerequisiteCheckResult>();
  const [prerequisitesLoading, setPrerequisitesLoading] = useState(true);
  const [status, setStatus] = useState("Ready");
  const [running, setRunning] = useState(false);
  const [engineBusyCount, setEngineBusyCount] = useState(0);
  const [sessionLoaded, setSessionLoaded] = useState(false);
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
  const [notebookCells, setNotebookCells] = useState<NotebookCell[]>([]);
  const [notebookRunning, setNotebookRunning] = useState(false);
  const [engineAllowed, setEngineAllowed] = useState(false);
  const [sqlPaneOpen, setSqlPaneOpen] = useState(true);
  const [sqlPaneWidth, setSqlPaneWidth] = useState(360);
  const [editorToolPanelWidth, setEditorToolPanelWidth] = useState(DEFAULT_EDITOR_TOOL_PANEL_WIDTH);
  const [lambdaMode, setLambdaMode] = useState(false);
  const [userSnippets, setUserSnippets] = useState<SnippetDefinition[]>([]);
  const [queryLibrary, setQueryLibrary] = useState<QueryLibraryState>(createEmptyQueryLibrary());
  const [activeEditorTool, setActiveEditorTool] = useState<EditorToolId | undefined>();
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | undefined>();
  const [compareBaseline, setCompareBaseline] = useState<EvaluationHistoryEntry | undefined>();
  const [benchmarking, setBenchmarking] = useState(false);
  const [benchmarkConfirmOpen, setBenchmarkConfirmOpen] = useState(false);
  const [benchmarkIterations, setBenchmarkIterations] = useState(5);
  const [installedPackIds, setInstalledPackIds] = useState<string[]>([]);
  const [scanItems, setScanItems] = useState<ScanReviewItem[]>([]);
  const [scanIndex, setScanIndex] = useState(0);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | undefined>();
  const [splashExiting, setSplashExiting] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const splashMountRef = useRef(Date.now());

  const activeQueryTab = useMemo(
    () => queryTabs.find((tab) => tab.id === activeQueryTabId),
    [queryTabs, activeQueryTabId],
  );

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

  const appReady = !!(settings && activeConnection && document && activeQueryTab);

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

  const payload = activeQueryTab?.lastPayload ?? emptyEvaluationPayload();
  const activeTab = activeQueryTab?.activeResultsTab ?? "result";
  const expression = activeQueryTab?.expression ?? "";

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

  const queryWorkspaceRef = useRef<QueryWorkspaceHandle>(null);

  const updateWorkspace = useCallback((workspace: EfvibeWorkspace) => {
    setDocument((current) => (current ? { ...current, workspace } : current));
  }, []);

  const applyWorkspaceUpdate = useCallback(
    (workspace: EfvibeWorkspace) => {
      updateWorkspace(workspace);
      setActiveConnectionId((currentId) => {
        if (workspace.connections.some((connection) => connection.id === currentId)) {
          return currentId;
        }

        return workspace.connections[0]?.id ?? "";
      });
      setQueryTabs((tabs) =>
        tabs.map((tab) => {
          if (workspace.connections.some((connection) => connection.id === tab.connectionId)) {
            return tab;
          }

          const fallbackId = workspace.connections[0]?.id ?? tab.connectionId;
          return { ...tab, connectionId: fallbackId };
        }),
      );
      void invalidateEfvibeDaemon();
      setStatus(`Updated workspace ${workspace.name}`);
    },
    [updateWorkspace],
  );

  const allowEngine = useCallback(() => {
    setEngineAllowed(true);
  }, []);

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

  const handleSqlPaneOpenChange = useCallback((open: boolean) => {
    setSqlPaneOpen(open);
  }, []);

  useEffect(() => {
    void (async () => {
      const loaded = await loadAppSettings();
      const home = await homeDir();
      if (!loaded.defaultWorkspaceRoot) {
        loaded.defaultWorkspaceRoot = getDefaultWorkspaceRoot(home);
      }

      const savedSession = await loadStudioSession();
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

        setActiveConnectionId(connectionId);

        if (savedSession.queryTabs?.length) {
          setQueryTabs(
            savedSession.queryTabs.map((tab) => ({
              ...tab,
              activeResultsTab: normalizeResultsTab(tab.activeResultsTab as LegacyResultsTab),
            })),
          );
          setActiveQueryTabId(
            savedSession.queryTabs.some((tab) => tab.id === savedSession.activeQueryTabId)
              ? savedSession.activeQueryTabId
              : savedSession.queryTabs[0].id,
          );
        } else {
          const tab = createQueryTab(connectionId, {
            expression: (savedSession as { expression?: string }).expression,
          });
          setQueryTabs([tab]);
          setActiveQueryTabId(tab.id);
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
          setHistory(savedSession.history);
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
          setNotebookCells(savedSession.notebookCells ?? createDefaultNotebook(connectionId));
        }
        if (savedSession.sqlPaneOpen !== undefined) {
          setSqlPaneOpen(savedSession.sqlPaneOpen);
        } else if (savedSession.liveSqlEnabled) {
          setSqlPaneOpen(true);
        }
        if (savedSession.sqlPaneWidth) {
          setSqlPaneWidth(savedSession.sqlPaneWidth);
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
      } else {
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
        setActiveConnectionId(connection.id);
        setQueryTabs([tab]);
        setActiveQueryTabId(tab.id);
      }

      setSettings(loaded);
      applyTheme(loaded.theme ?? "dark");
      setSessionLoaded(true);
    })();
  }, []);

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
      if (!sessionLoaded || !document) {
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
        resultsDockHeight,
        explorerExpandedNodes,
        history,
        mainView,
        notebookName,
        notebookPath,
        notebookConnectionId,
        notebookCells,
        liveSqlEnabled: sqlPaneOpen,
        sqlPaneOpen,
        sqlPaneWidth,
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
      document,
      activeConnectionId,
      queryTabs,
      activeQueryTabId,
      resultsDockHeight,
      explorerExpandedNodes,
      history,
      mainView,
      notebookName,
      notebookPath,
      notebookConnectionId,
      notebookCells,
      sqlPaneOpen,
      sqlPaneWidth,
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
    if (!activeQueryTab) {
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
    if (!settings) {
      return;
    }

    void (async () => {
      setPrerequisitesLoading(true);
      try {
        const result = await checkPrerequisites(
          searchDirectory || ".",
          settings.toolPath,
          activeConnection?.dotnetFramework ?? "",
        );
        setPrerequisites(result);
      } finally {
        setPrerequisitesLoading(false);
      }
    })();
  }, [settings, searchDirectory, activeConnection?.dotnetFramework]);

  const handleRunSql = useCallback(
    async (sql: string, withPlan = false) => {
      if (!connectionSettings || !settings || !document || !activeQueryTab) {
        setStatus("Configure a connection before running SQL.");
        return;
      }

      const trimmed = sql.trim();
      if (!trimmed) {
        return;
      }

      allowEngine();

      if (!searchDirectory) {
        const errorPayload: EvaluationJsonPayload = {
          success: false,
          sql: [trimmed],
          metrics: { totalMs: 0, sqlCommandCount: 0, resultKind: "error" },
          warnings: [],
          error:
            "Set a search directory or EF project in Settings so efvibe can discover your .csproj.",
        };
        updateQueryTab(activeQueryTab.id, {
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
          connectionSettings,
          searchDirectory,
          searchDirectory,
          trimmed,
          withPlan,
        );

        if (result.payload) {
          const nextTab: ResultsTab = withPlan ? "plan" : "result";

          updateQueryTab(activeQueryTab.id, {
            lastPayload: result.payload,
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
                trimmed,
                result.payload!,
                activeConnection?.name ?? "Connection",
              ),
            );
          }

          setStatus(
            result.payload.success
              ? `SQL done · ${result.payload.metrics.totalMs} ms`
              : result.payload.error ?? "SQL execution failed.",
          );
        } else {
          updateQueryTab(activeQueryTab.id, {
            lastPayload: {
              success: false,
              sql: [trimmed],
              metrics: { totalMs: 0, sqlCommandCount: 0, resultKind: "error" },
              warnings: [],
              error: result.stdout || "No SQL result payload returned.",
            },
            activeResultsTab: "messages",
          });
          setStatus("SQL execution failed.");
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
        updateQueryTab(activeQueryTab.id, {
          lastPayload: {
            success: false,
            sql: [trimmed],
            metrics: { totalMs: 0, sqlCommandCount: 0, resultKind: "error" },
            warnings: [],
            error: message,
          },
          activeResultsTab: "messages",
        });
        setStatus(message);
      } finally {
        setRunning(false);
      }
    },
    [
      activeConnection?.name,
      activeQueryTab,
      allowEngine,
      connectionSettings,
      document,
      searchDirectory,
      settings,
      updateQueryTab,
    ],
  );

  const handleRun = useCallback(
    async (withPlan = false, expressionOverride?: string) => {
      if (!connectionSettings || !settings || !document || !activeQueryTab) {
        setStatus("Configure a connection before running.");
        return;
      }

      queryWorkspaceRef.current?.flush();
      const rawInput = (
        expressionOverride ??
        queryWorkspaceRef.current?.getRunText() ??
        queryWorkspaceRef.current?.getDraft() ??
        activeQueryTab.expression
      ).trim();
      if (!rawInput) {
        return;
      }

      const updateExpression = expressionOverride === undefined;

      if (looksLikeRawSql(rawInput)) {
        await handleRunSql(rawInput, withPlan);
        return;
      }

      const runExpression = normalizeExpression(rawInput, lambdaMode);

      if (!searchDirectory) {
        const errorPayload: EvaluationJsonPayload = {
          success: false,
          sql: [],
          metrics: { totalMs: 0, sqlCommandCount: 0, resultKind: "error" },
          warnings: [],
          error:
            "Set a search directory or EF project in Settings so efvibe can discover your .csproj.",
        };
        updateQueryTab(activeQueryTab.id, {
          lastPayload: errorPayload,
          activeResultsTab: "result",
        });
        setStatus("Set a search directory or EF project in Settings.");
        return;
      }

      allowEngine();
      setRunning(true);
      setStatus(withPlan ? "Running with plan…" : "Running…");
      await yieldToUi();

      try {
        const result = await runExpressionViaDaemon(
          connectionSettings,
          searchDirectory,
          searchDirectory,
          runExpression,
          withPlan,
        );

        if (result.payload) {
          const nextTab: ResultsTab = withPlan ? "plan" : "result";

          updateQueryTab(activeQueryTab.id, {
            ...(updateExpression ? { expression: runExpression } : {}),
            lastPayload: result.payload,
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
                activeConnection?.name ?? "Connection",
              ),
            );
          }

          setStatus(
            result.payload.success
              ? `Done · ${result.payload.metrics.totalMs} ms`
              : result.payload.error ?? "Evaluation failed.",
          );
        } else {
          updateQueryTab(activeQueryTab.id, {
            ...(updateExpression ? { expression: runExpression } : {}),
            lastPayload: {
              success: false,
              sql: [],
              metrics: { totalMs: 0, sqlCommandCount: 0, resultKind: "error" },
              warnings: [],
              error: result.stdout || "No evaluation payload returned.",
            },
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
        updateQueryTab(activeQueryTab.id, {
          ...(updateExpression ? { expression: runExpression } : {}),
          lastPayload: {
            success: false,
            sql: [],
            metrics: { totalMs: 0, sqlCommandCount: 0, resultKind: "error" },
            warnings: [],
            error: message,
          },
          activeResultsTab: "messages",
        });
        setStatus(message);
      } finally {
        setRunning(false);
      }
    },
    [
      connectionSettings,
      settings,
      document,
      activeQueryTab,
      searchDirectory,
      activeConnection?.name,
      updateQueryTab,
      lambdaMode,
      handleRunSql,
      allowEngine,
    ],
  );

  const handleStopQuery = useCallback(() => {
    void cancelEfvibeDaemonRequest();
    setStatus("Stopping query…");
  }, []);

  useEffect(() => {
    const listener = () => {
      void handleRun(false);
    };

    window.addEventListener(RUN_QUERY_EVENT, listener);
    return () => window.removeEventListener(RUN_QUERY_EVENT, listener);
  }, [handleRun]);

  useEffect(() => {
    const listener = () => {
      void handleRun(true);
    };

    window.addEventListener(RUN_PLAN_EVENT, listener);
    return () => window.removeEventListener(RUN_PLAN_EVENT, listener);
  }, [handleRun]);

  function selectQueryTab(tabId: string) {
    setActiveQueryTabId(tabId);
    const tab = queryTabs.find((entry) => entry.id === tabId);
    if (tab) {
      setActiveConnectionId(tab.connectionId);
    }
  }

  function addQueryTab() {
    if (!document) {
      return;
    }

    const tab = createQueryTab(activeConnectionId, {
      name: `Query ${queryTabs.length + 1}`,
    });
    setQueryTabs((tabs) => [...tabs, tab]);
    setActiveQueryTabId(tab.id);
  }

  function closeQueryTab(tabId: string) {
    if (queryTabs.length <= 1) {
      return;
    }

    const nextTabs = queryTabs.filter((tab) => tab.id !== tabId);
    setQueryTabs(nextTabs);
    if (activeQueryTabId === tabId) {
      const nextTab = nextTabs[0];
      setActiveQueryTabId(nextTab.id);
      setActiveConnectionId(nextTab.connectionId);
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
      setActiveQueryTabId(opened.id);
      setActiveConnectionId(opened.connectionId);
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
      setActiveConnectionId(connectionId);
      const tab = createQueryTab(connectionId);
      setQueryTabs([tab]);
      setActiveQueryTabId(tab.id);
      await invalidateEfvibeDaemon();
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
    setActiveConnectionId(connection.id);
    setQueryTabs([tab]);
    setActiveQueryTabId(tab.id);
    await invalidateEfvibeDaemon();
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
    }
    if (view === "notebook" && notebookCells.length === 0) {
      setNotebookCells(createDefaultNotebook(activeConnectionId));
      setNotebookConnectionId(activeConnectionId);
    }
  }

  const handleOpenErDiagram = useCallback((dbSet?: string) => {
    setDiagramViewMounted(true);
    setMainView("diagram");
    setDiagramFocusRequest((previous) => ({ dbSet, nonce: previous.nonce + 1 }));
  }, []);

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
      await invalidateEfvibeDaemon();
    })();
  }

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

  async function handleSaveNotebook() {
    try {
      const savedPath = await saveNotebookFile(
        notebookName,
        notebookPath,
        notebookConnectionId,
        notebookCells,
      );
      setNotebookPath(savedPath);
      setStatus(`Saved notebook ${savedPath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message !== "Save cancelled.") {
        setStatus(`Notebook save failed: ${message}`);
      }
    }
  }

  async function handleRunNotebook() {
    setNotebookRunning(true);
    await yieldToUi();
    try {
      for (const cell of notebookCells) {
        if (cell.kind !== "code" || !cell.value.trim()) {
          continue;
        }

        await handleRun(false, cell.value);
      }
      setStatus("Notebook run complete.");
    } finally {
      setNotebookRunning(false);
    }
  }

  function requestBenchmark(iterations = 5) {
    if (!connectionSettings || !searchDirectory || !activeQueryTab) {
      setStatus("Configure a connection before benchmarking.");
      return;
    }

    if (!activeQueryTab.expression.trim()) {
      setStatus("Enter a query in the editor before benchmarking.");
      return;
    }

    setBenchmarkIterations(iterations);
    setBenchmarkConfirmOpen(true);
  }

  async function handleBenchmark(iterations = 5) {
    if (!connectionSettings || !searchDirectory || !activeQueryTab) {
      setStatus("Configure a connection before benchmarking.");
      return;
    }

    allowEngine();
    setBenchmarking(true);
    setStatus(`Benchmarking (${iterations} runs)…`);
    await yieldToUi();
    try {
      const result = await runBenchmark(
        connectionSettings,
        searchDirectory,
        normalizeExpression(activeQueryTab.expression, lambdaMode),
        iterations,
      );
      setBenchmarkResult(result);
      setActiveEditorTool("charts");
      setStatus(`Benchmark avg ${result.averageMs} ms`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBenchmarking(false);
    }
  }

  function handleToggleFavorite(tabId: string) {
    setQueryTabs((tabs) =>
      tabs.map((tab) =>
        tab.id === tabId ? { ...tab, favorite: !tab.favorite } : tab,
      ),
    );
  }

  function handleAddFolder(name: string) {
    setQueryLibrary((library) => ({
      ...library,
      folders: [...library.folders, createQueryFolder(name)],
    }));
  }

  function handleAssignFolder(tabId: string, folderId?: string) {
    setQueryTabs((tabs) =>
      tabs.map((tab) => (tab.id === tabId ? { ...tab, folderId } : tab)),
    );
  }

  function handleOpenQueryInNewTab(expression: string, connectionId: string, name?: string) {
    const tab = createQueryTab(connectionId, {
      expression,
      name: name ?? `Query ${queryTabs.length + 1}`,
    });
    setQueryTabs((tabs) => [...tabs, tab]);
    setActiveQueryTabId(tab.id);
    setActiveConnectionId(connectionId);
  }

  function handleOpenLibraryQuery(expression: string, connectionId: string, name?: string) {
    if (!document) {
      return;
    }

    const existing = queryTabs.find(
      (tab) => tab.expression === expression && tab.connectionId === connectionId,
    );
    if (existing) {
      setActiveQueryTabId(existing.id);
      setActiveConnectionId(existing.connectionId);
      return;
    }

    const tab = createQueryTab(connectionId, { expression, name });
    setQueryTabs((tabs) => [...tabs, tab]);
    setActiveQueryTabId(tab.id);
    setActiveConnectionId(connectionId);
  }

  function handleInsertSnippet(expression: string) {
    if (!activeQueryTab) {
      return;
    }

    updateQueryTab(activeQueryTab.id, { expression });
  }

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

  const connectionEditorConnection =
    document && connectionEditorId
      ? document.workspace.connections.find((connection) => connection.id === connectionEditorId)
      : undefined;

  const showBusyOverlay =
    running || benchmarking || notebookRunning || engineBusyCount > 0;

  const busyMessage =
    running || benchmarking || notebookRunning ? status : "Working with efvibe…";

  if (!splashDone) {
    const splashMessage = appReady ? "Opening workspace…" : "Loading workspace…";
    return <SplashScreen message={splashMessage} exiting={splashExiting} />;
  }

  if (!appReady) {
    return <SplashScreen message="Loading workspace…" />;
  }

  return (
    <main className="app">
      <header className="topbar">
        <ConnectionPicker
          connections={document.workspace.connections}
          activeConnectionId={activeConnectionId}
          onChange={(connectionId) => {
            setActiveConnectionId(connectionId);
            updateQueryTab(activeQueryTab.id, { connectionId });
            void invalidateEfvibeDaemon();
          }}
        />
        <MainViewSwitcher value={mainView} onChange={handleMainViewChange} />
        {mainView === "query" ? (
        <div className="runbar">
          <button type="button" disabled={running} onClick={() => void handleRun(false)}>
            Run
          </button>
          <button type="button" disabled={running} onClick={() => void handleRun(true)}>
            Run Plan
          </button>
          <button
            type="button"
            className="runbar-stop"
            disabled={!running}
            onClick={handleStopQuery}
          >
            Stop
          </button>
          <button
            type="button"
            disabled={history.length === 0}
            onClick={() => {
              setCompareBaseline(history[0]);
              setStatus("Compare baseline set from last run.");
            }}
          >
            Set baseline
          </button>
        </div>
        ) : null}
        <div
          className="status-bar"
          role="status"
          aria-live="polite"
          aria-busy={showBusyOverlay}
          title={showBusyOverlay ? busyMessage : status}
        >
          {showBusyOverlay ? (
            <StatusBarBusy message={busyMessage} />
          ) : (
            <span className="status-bar-text">{status}</span>
          )}
        </div>
      </header>

      <PrerequisitesBanner result={prerequisites} loading={prerequisitesLoading} />

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
          history={history}
          queryTabs={queryTabs}
          queryLibrary={queryLibrary}
          userSnippets={userSnippets}
          teamSyncDirectory={settings.teamSyncDirectory}
          cloudSyncDirectory={settings.cloudSyncDirectory ?? ""}
          installedPackIds={installedPackIds}
          onSelectConnection={(connectionId) => {
            setActiveConnectionId(connectionId);
            updateQueryTab(activeQueryTab.id, { connectionId });
            void invalidateEfvibeDaemon();
          }}
          onAddConnection={() => {
            const connection = createSampleConnection(
              `Connection ${document.workspace.connections.length + 1}`,
            );
            updateWorkspace({
              ...document.workspace,
              connections: [...document.workspace.connections, connection],
            });
            setActiveConnectionId(connection.id);
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
            setActiveConnectionId(copy.id);
          }}
          onRefreshConnection={(connectionId) => {
            const connection = document.workspace.connections.find(
              (entry) => entry.id === connectionId,
            );
            if (!connection) {
              return;
            }

            if (connectionId !== activeConnectionId) {
              setActiveConnectionId(connectionId);
              updateQueryTab(activeQueryTab.id, { connectionId });
            }

            void (async () => {
              await invalidateEfvibeDaemon();
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

            if (connectionId !== activeConnectionId) {
              setActiveConnectionId(connectionId);
              updateQueryTab(activeQueryTab.id, { connectionId });
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
              allowEngine();
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
              await invalidateEfvibeDaemon();
              setEngineAllowed(false);
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
            setActiveConnectionId(nextId);
            setQueryTabs((tabs) =>
              tabs.map((tab) =>
                tab.connectionId === connectionId ? { ...tab, connectionId: nextId } : tab,
              ),
            );
          }}
          onEditConnection={(connectionId) => {
            setConnectionEditorId(connectionId);
          }}
          onOpenQueryTab={handleOpenQueryInNewTab}
          onHistorySelect={(nextExpression) => {
            updateQueryTab(activeQueryTab.id, { expression: nextExpression });
          }}
          onOpenLibraryQuery={handleOpenLibraryQuery}
          onToggleFavorite={handleToggleFavorite}
          onAddFolder={handleAddFolder}
          onAssignFolder={handleAssignFolder}
          onInsertSnippet={handleInsertSnippet}
          onAddSnippet={handleAddSnippet}
          onRemoveSnippet={handleRemoveSnippet}
          onImportPack={handleImportPack}
          onInstallPackId={handleInstallPackId}
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
              <QueryTabBar
                tabs={queryTabs}
                activeTabId={activeQueryTabId}
                onSelect={selectQueryTab}
                onAdd={addQueryTab}
                onClose={closeQueryTab}
                onOpen={() => void handleOpenQuery()}
                onSave={() => void handleSaveQuery()}
                onToggleFavorite={handleToggleFavorite}
              />

              <div className="editor-shell">
                <EditorToolRail
                  activeTool={activeEditorTool}
                  onSelect={handleEditorTool}
                  onBenchmark={() => requestBenchmark(5)}
                  benchmarking={benchmarking}
                  running={running}
                />

                {activeEditorTool ? (
                  <ResizableEditorToolPanel
                    width={editorToolPanelWidth}
                    onWidthChange={setEditorToolPanelWidth}
                  >
                    <EditorToolPanel
                      tool={activeEditorTool}
                      history={history}
                      compareBaseline={compareBaseline}
                      benchmark={benchmarkResult}
                      userSnippets={userSnippets}
                      favoriteTabs={favoriteTabs}
                      scanItems={scanItems}
                      scanIndex={scanIndex}
                      scanLoading={scanLoading}
                      scanError={scanError}
                      theme={settings.theme ?? "dark"}
                      onClose={() => setActiveEditorTool(undefined)}
                      onHistorySelect={(nextExpression) => {
                        updateQueryTab(activeQueryTab.id, { expression: nextExpression });
                      }}
                      onInsertSnippet={handleInsertSnippet}
                      onAddSnippet={handleAddSnippet}
                      onRemoveSnippet={handleRemoveSnippet}
                      onOpenFavorite={(tab) => selectQueryTab(tab.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onRunScan={(mode) => void runScan(mode)}
                    onScanIndexChange={setScanIndex}
                    onGoToSource={(file, line) => void handleGoToSource(file, line)}
                    onRunQuery={(expression) => {
                      updateQueryTab(activeQueryTab.id, { expression });
                      void handleRun(false, expression);
                    }}
                    onDismissFinding={(note) => void handleDismissScanFinding(note)}
                    onSaveFindingNote={(note) => void handleSaveScanFindingNote(note)}
                    running={running}
                  />
                  </ResizableEditorToolPanel>
                ) : null}

                <div className="editor-shell-main">
                  <ResizableResultsDock
                    height={resultsDockHeight}
                    onHeightChange={setResultsDockHeight}
                    editor={
                      <QueryWorkspace
                        ref={queryWorkspaceRef}
                        tabId={activeQueryTab.id}
                        expression={expression}
                        theme={settings.theme ?? "dark"}
                        onExpressionChange={handleExpressionChange}
                        sqlPaneOpen={sqlPaneOpen}
                        onSqlPaneOpenChange={handleSqlPaneOpenChange}
                        sqlPaneWidth={sqlPaneWidth}
                        onSqlPaneWidthChange={setSqlPaneWidth}
                        connectionSettings={connectionSettings}
                        searchDirectory={searchDirectory}
                        autoPreviewAllowed={engineAllowed}
                        running={running}
                        onEngineBusyChange={adjustEngineBusy}
                        onRequestEngine={allowEngine}
                        onRun={(text) => void handleRun(false, text)}
                        keybindings={keybindings}
                      />
                    }
                    results={
                      <ResultsTabs
                        payload={payload}
                        activeTab={activeTab}
                        onTabChange={(tab) =>
                          updateQueryTab(activeQueryTab.id, { activeResultsTab: tab })
                        }
                        onExport={(format) => void handleExport(format)}
                        onSaveRows={async (rows) => {
                          if (!connectionSettings || !searchDirectory || !activeQueryTab?.lastPayload) {
                            const message = "Configure a connection before saving result changes.";
                            setStatus(message);
                            throw new Error(message);
                          }

                          const baseline = activeQueryTab.resultRowsBaseline;
                          const entity = activeQueryTab.resultEntity;

                          if (!baseline || !entity) {
                            const message =
                              "These results cannot be saved to the database. Run a DbSet LINQ query (for example db.Products.Take(10).ToList()) that returns entity rows with primary keys.";
                            setStatus(message);
                            throw new Error(message);
                          }

                          try {
                            const message = await persistResultChanges(
                              connectionSettings,
                              searchDirectory,
                              searchDirectory,
                              entity,
                              baseline,
                              rows,
                            );

                            updateQueryTab(activeQueryTab.id, {
                              lastPayload: {
                                ...activeQueryTab.lastPayload,
                                rows: rows.map((row) => ({ ...row })),
                                metrics: {
                                  ...activeQueryTab.lastPayload.metrics,
                                  rowCount: rows.length,
                                },
                              },
                              resultRowsBaseline: rows.map((row) => ({ ...row })),
                            });
                            setStatus(message);
                          } catch (error) {
                            const message = error instanceof Error ? error.message : String(error);
                            setStatus(message);
                            throw error;
                          }
                        }}
                      />
                    }
                  />
                </div>
              </div>
            </>
          ) : null}

          {diagramViewMounted && connectionSettings ? (
            <div
              className={
                mainView === "diagram" ? "main-view-slot" : "main-view-slot main-view-hidden"
              }
            >
              <ErDiagramView
                connectionName={connectionDisplayName(activeConnection)}
                connectionSettings={connectionSettings}
                searchDirectory={searchDirectory}
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
              name={notebookName}
              cells={notebookCells}
              running={notebookRunning}
              onNameChange={setNotebookName}
              onCellChange={(cellId, value) =>
                setNotebookCells((cells) =>
                  cells.map((cell) => (cell.id === cellId ? { ...cell, value } : cell)),
                )
              }
              onAddCell={() =>
                setNotebookCells((cells) => [
                  ...cells,
                  { id: crypto.randomUUID(), kind: "code", value: "" },
                ])
              }
              onRemoveCell={(cellId) =>
                setNotebookCells((cells) => cells.filter((cell) => cell.id !== cellId))
              }
              onOpen={() => void handleOpenNotebook()}
              onSave={() => void handleSaveNotebook()}
              onRunAll={() => void handleRunNotebook()}
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

      <ConfirmDialog
        open={benchmarkConfirmOpen}
        title="Run benchmark?"
        message={`The query in the editor will be executed ${benchmarkIterations} times against your database.`}
        detail={activeQueryTab?.expression.trim()}
        confirmLabel="Run benchmark"
        cancelLabel="Cancel"
        onClose={() => setBenchmarkConfirmOpen(false)}
        onConfirm={() => {
          setBenchmarkConfirmOpen(false);
          void handleBenchmark(benchmarkIterations);
        }}
      />

    </main>
  );
}

export default App;
