import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { homeDir } from "@tauri-apps/api/path";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { ConnectionPicker } from "./components/ConnectionPicker";
import { SplashScreen } from "./components/SplashScreen";
import { StatusBarBusy } from "./components/StatusBarBusy";
import { EditorToolPanel } from "./components/EditorToolPanel";
import { EditorToolRail, type EditorToolId } from "./components/EditorToolRail";
import { QueryWorkspace, type QueryWorkspaceHandle } from "./components/QueryWorkspace";
import { NotebookPanel } from "./components/NotebookPanel";
import { PrerequisitesBanner } from "./components/PrerequisitesBanner";
import { QueryTabBar } from "./components/QueryTabBar";
import { ResizableResultsDock, DEFAULT_RESULTS_DOCK_HEIGHT } from "./components/ResizableResultsDock";
import { ResultsTabs } from "./components/ResultsTabs";
import { SettingsPanel } from "./components/SettingsPanel";
import { SqlToLinqDialog } from "./components/SqlToLinqDialog";
import { ExplorerSidebar } from "./components/explorer/ExplorerSidebar";
import { resolveExplorerExpandedNodes, normalizeExplorerExpandedNodes } from "./components/explorer/types";
import { runBenchmark, type BenchmarkResult } from "./lib/benchmark";
import {
  checkPrerequisites,
  invalidateEfvibeDaemon,
  openInIde,
  runExpressionViaDaemon,
  startRepl,
} from "./lib/daemonClient";
import { recordHistoryEntry, type EvaluationHistoryEntry } from "./lib/history";
import { openNotebookFile, saveNotebookFile } from "./lib/notebook";
import { openQueryFile, saveQueryFile } from "./lib/queryFile";
import { runSqlViaDaemon } from "./lib/rawSql";
import { looksLikeRawSql } from "./lib/sqlDetect";
import { RUN_QUERY_EVENT, type RunQueryEventDetail } from "./lib/editorRun";
import { buildExportContent } from "./lib/resultFormat";
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
import { formatStudioWindowTitle, setWindowTitle } from "./lib/windowTitle";
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
import { createQueryTab, normalizeResultsTab, type LegacyResultsTab, type QueryTab, type ResultsTab } from "./types/query";
import { createUserSnippet, type SnippetDefinition } from "./types/snippets";
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
  const [editingConnectionId, setEditingConnectionId] = useState<string | undefined>();
  const [prerequisites, setPrerequisites] = useState<PrerequisiteCheckResult>();
  const [prerequisitesLoading, setPrerequisitesLoading] = useState(true);
  const [status, setStatus] = useState("Ready");
  const [running, setRunning] = useState(false);
  const [engineBusyCount, setEngineBusyCount] = useState(0);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [resultsDockHeight, setResultsDockHeight] = useState(DEFAULT_RESULTS_DOCK_HEIGHT);
  const [explorerExpandedNodes, setExplorerExpandedNodes] = useState<string[]>(
    resolveExplorerExpandedNodes(),
  );
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [history, setHistory] = useState<EvaluationHistoryEntry[]>([]);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [notebookName, setNotebookName] = useState("Notebook");
  const [notebookPath, setNotebookPath] = useState("");
  const [notebookConnectionId, setNotebookConnectionId] = useState("");
  const [notebookCells, setNotebookCells] = useState<NotebookCell[]>([]);
  const [notebookRunning, setNotebookRunning] = useState(false);
  const [engineAllowed, setEngineAllowed] = useState(false);
  const [sqlPaneOpen, setSqlPaneOpen] = useState(true);
  const [sqlPaneWidth, setSqlPaneWidth] = useState(360);
  const [lambdaMode, setLambdaMode] = useState(false);
  const [userSnippets, setUserSnippets] = useState<SnippetDefinition[]>([]);
  const [queryLibrary, setQueryLibrary] = useState<QueryLibraryState>(createEmptyQueryLibrary());
  const [compareBaseline, setCompareBaseline] = useState<EvaluationHistoryEntry | undefined>();
  const [activeEditorTool, setActiveEditorTool] = useState<EditorToolId | undefined>();
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | undefined>();
  const [sqlToLinqOpen, setSqlToLinqOpen] = useState(false);
  const [sqlToLinqInitial, setSqlToLinqInitial] = useState("");
  const [benchmarking, setBenchmarking] = useState(false);
  const [installedPackIds, setInstalledPackIds] = useState<string[]>([]);
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

  const allowEngine = useCallback(() => {
    setEngineAllowed(true);
  }, []);

  const adjustEngineBusy = useCallback((delta: number) => {
    setEngineBusyCount((count) => Math.max(0, count + delta));
  }, []);

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
        setDocument({
          path: savedSession.workspacePath,
          workspace: savedSession.workspace,
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
        if (savedSession.notebookOpen) {
          setNotebookOpen(true);
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
        if (savedSession.lambdaMode) {
          setLambdaMode(savedSession.lambdaMode);
        }
        if (savedSession.userSnippets) {
          setUserSnippets(savedSession.userSnippets);
        }
        if (savedSession.queryLibrary) {
          setQueryLibrary(savedSession.queryLibrary);
        }
        if (savedSession.compareBaseline) {
          setCompareBaseline(savedSession.compareBaseline);
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
        workspace: document.workspace,
        activeConnectionId,
        queryTabs,
        activeQueryTabId,
        resultsDockHeight,
        explorerExpandedNodes,
        history,
        notebookOpen,
        notebookName,
        notebookPath,
        notebookConnectionId,
        notebookCells,
        liveSqlEnabled: sqlPaneOpen,
        sqlPaneOpen,
        sqlPaneWidth,
        lambdaMode,
        userSnippets,
        queryLibrary,
        compareBaseline,
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
      notebookOpen,
      notebookName,
      notebookPath,
      notebookConnectionId,
      notebookCells,
      sqlPaneOpen,
      sqlPaneWidth,
      lambdaMode,
      userSnippets,
      queryLibrary,
      compareBaseline,
      installedPackIds,
      explorerOpen,
    ],
    800,
  );

  const toggleExplorer = useCallback(() => {
    setExplorerOpen((open) => !open);
  }, []);

  useEffect(() => {
    if (!activeConnection) {
      return;
    }

    const title = formatStudioWindowTitle(connectionDisplayName(activeConnection));
    void setWindowTitle(title).catch((error) => {
      console.error("Failed to set window title:", error);
    });
  }, [activeConnection]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (event.ctrlKey && !event.altKey && !event.metaKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleExplorer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleExplorer]);

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
        expressionOverride ?? queryWorkspaceRef.current?.getDraft() ?? activeQueryTab.expression
      ).trim();
      if (!rawInput) {
        return;
      }

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
            expression: runExpression,
            lastPayload: result.payload,
            activeResultsTab: nextTab,
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
            expression: runExpression,
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
        updateQueryTab(activeQueryTab.id, {
          expression: runExpression,
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

  useEffect(() => {
    const listener = (event: Event) => {
      const text = (event as CustomEvent<RunQueryEventDetail>).detail?.text?.trim();
      void handleRun(false, text || undefined);
    };

    window.addEventListener(RUN_QUERY_EVENT, listener);
    return () => window.removeEventListener(RUN_QUERY_EVENT, listener);
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

  async function handleSaveQuery() {
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
  }

  async function handleOpenWorkspace() {
    try {
      const opened = await openWorkspaceFile();
      if (!opened) {
        return;
      }

      setDocument(opened);
      const connectionId = opened.workspace.connections[0]?.id ?? "";
      setActiveConnectionId(connectionId);
      const tab = createQueryTab(connectionId);
      setQueryTabs([tab]);
      setActiveQueryTabId(tab.id);
      await invalidateEfvibeDaemon();
      setStatus(`Opened ${opened.workspace.name}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSaveWorkspace() {
    if (!document) {
      return;
    }

    try {
      const saved = await saveWorkspaceFile(document);
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

    updateWorkspace({
      ...document.workspace,
      connections: document.workspace.connections.map((entry) =>
        entry.id === connection.id ? connection : entry,
      ),
    });
    void invalidateEfvibeDaemon();
  }

  function openNotebook() {
    setNotebookOpen(true);
    if (notebookCells.length === 0) {
      setNotebookCells(createDefaultNotebook(activeConnectionId));
      setNotebookConnectionId(activeConnectionId);
    }
  }

  async function handleOpenNotebook() {
    const opened = await openNotebookFile(activeConnectionId);
    if (!opened) {
      return;
    }

    setNotebookOpen(true);
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

  function handleSetCompareBaseline() {
    const latest = history[0];
    if (!latest) {
      setStatus("Run a query before setting a compare baseline.");
      return;
    }

    setCompareBaseline(latest);
    setStatus("Compare baseline set.");
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

  function openSqlToLinq(sql = "") {
    setSqlToLinqInitial(sql);
    setSqlToLinqOpen(true);
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

  const editingConnection =
    document && editingConnectionId
      ? document.workspace.connections.find((connection) => connection.id === editingConnectionId)
      : activeConnection;

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
        <div className="menu">
          <button type="button" onClick={openNotebook}>
            Notebook
          </button>
          <button type="button" onClick={() => void handleStartRepl()}>
            REPL
          </button>
        </div>
        <div className="runbar">
          <button type="button" disabled={running} onClick={() => void handleRun(false)}>
            Run
          </button>
          <button type="button" disabled={running} onClick={() => void handleRun(true)}>
            Run Plan
          </button>
          <button type="button" disabled={benchmarking || running} onClick={() => void handleBenchmark(5)}>
            Benchmark
          </button>
          <button type="button" onClick={handleSetCompareBaseline}>
            Set baseline
          </button>
          <button type="button" onClick={() => openSqlToLinq()}>
            SQL → LINQ
          </button>
        </div>
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
          documentPath={document.path}
          workspaceDirectory={workspaceDirectory}
          appSettings={settings}
          workspaceName={document.workspace.name}
          expandedNodeIds={explorerExpandedNodes}
          onExpandedNodeIdsChange={setExplorerExpandedNodes}
          connections={document.workspace.connections}
          activeConnectionId={activeConnectionId}
          connectionSettings={connectionSettings}
          searchDirectory={searchDirectory}
          history={history}
          queryTabs={queryTabs}
          queryLibrary={queryLibrary}
          userSnippets={userSnippets}
          teamSyncDirectory={settings.teamSyncDirectory}
          preferredEditor={settings.preferredEditor}
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
            setEditingConnectionId(connectionId);
            setSettingsOpen(true);
          }}
          onRunExpression={(nextExpression) => {
            updateQueryTab(activeQueryTab.id, { expression: nextExpression });
            void handleRun(false, nextExpression);
          }}
          onHistorySelect={(nextExpression) => {
            updateQueryTab(activeQueryTab.id, { expression: nextExpression });
          }}
          onGoToSource={(file, line) => void handleGoToSource(file, line)}
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
          onOpenSettings={() => setSettingsOpen(true)}
          onRequestEngine={allowEngine}
          onEngineBusyChange={adjustEngineBusy}
          theme={settings.theme ?? "dark"}
          onToggleTheme={handleToggleTheme}
        />
        ) : null}

        <div className="main-stack">
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
            <EditorToolRail activeTool={activeEditorTool} onSelect={handleEditorTool} />

            {activeEditorTool ? (
              <EditorToolPanel
                tool={activeEditorTool}
                history={history}
                baseline={compareBaseline}
                benchmark={benchmarkResult}
                userSnippets={userSnippets}
                favoriteTabs={favoriteTabs}
                onClose={() => setActiveEditorTool(undefined)}
                onHistorySelect={(nextExpression) => {
                  updateQueryTab(activeQueryTab.id, { expression: nextExpression });
                }}
                onInsertSnippet={handleInsertSnippet}
                onAddSnippet={handleAddSnippet}
                onRemoveSnippet={handleRemoveSnippet}
                onOpenFavorite={(tab) => selectQueryTab(tab.id)}
                onToggleFavorite={handleToggleFavorite}
              />
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
                    onRunSql={(sql) => void handleRunSql(sql)}
                    onConvertSql={(sql) => openSqlToLinq(sql)}
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
                  />
                }
              />
            </div>
          </div>
        </div>
      </div>

      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        connection={editingConnection ?? activeConnection}
        onClose={() => {
          setSettingsOpen(false);
          setEditingConnectionId(undefined);
        }}
        onSettingsChange={setSettings}
        onConnectionChange={updateConnection}
      />

      <NotebookPanel
        open={notebookOpen}
        name={notebookName}
        cells={notebookCells}
        running={notebookRunning}
        onClose={() => setNotebookOpen(false)}
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

      <SqlToLinqDialog
        open={sqlToLinqOpen}
        initialSql={sqlToLinqInitial}
        connectionSettings={connectionSettings}
        searchDirectory={searchDirectory}
        onClose={() => setSqlToLinqOpen(false)}
        onInsert={(linq) => {
          updateQueryTab(activeQueryTab.id, { expression: linq });
          setSqlToLinqOpen(false);
          setStatus("Inserted SQL → LINQ draft.");
        }}
      />
    </main>
  );
}

export default App;
