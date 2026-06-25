import { useCallback, useEffect, useMemo, useState } from "react";
import { homeDir } from "@tauri-apps/api/path";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { MonacoEditor } from "./components/MonacoEditor";
import { ResizableResultsDock, DEFAULT_RESULTS_DOCK_HEIGHT } from "./components/ResizableResultsDock";
import { PrerequisitesBanner } from "./components/PrerequisitesBanner";
import { ResultsTabs } from "./components/ResultsTabs";
import { SettingsPanel } from "./components/SettingsPanel";
import { getActiveConnection, WorkspaceSidebar } from "./components/WorkspaceSidebar";
import {
  checkPrerequisites,
  invalidateEfvibeDaemon,
  openInIde,
  runExpressionViaDaemon,
} from "./lib/daemonClient";
import { getDefaultWorkspaceRoot, loadAppSettings, loadStudioSession, saveAppSettings, saveStudioSession } from "./lib/settings";
import { buildExportContent } from "./lib/resultFormat";
import {
  createNewWorkspace,
  openWorkspaceFile,
  saveWorkspaceFile,
  workspaceDirectoryFromPath,
  type WorkspaceDocument,
} from "./lib/workspace";
import type { AppSettings, PrerequisiteCheckResult } from "./types/connection";
import { emptyEvaluationPayload, type EvaluationJsonPayload } from "./types/evaluation";
import {
  createSampleConnection,
  resolveSearchDirectory,
  workspaceConnectionToSettings,
  type EfvibeWorkspace,
} from "./types/workspace";
import "./App.css";

type ResultsTab = "result" | "sql" | "plan" | "messages";

const DEFAULT_EXPRESSION = "db.Products.Take(5).ToList();";

function App() {
  const [document, setDocument] = useState<WorkspaceDocument | undefined>();
  const [activeConnectionId, setActiveConnectionId] = useState("");
  const [expression, setExpression] = useState(DEFAULT_EXPRESSION);
  const [payload, setPayload] = useState<EvaluationJsonPayload>(() => emptyEvaluationPayload());
  const [activeTab, setActiveTab] = useState<ResultsTab>("result");
  const [settings, setSettings] = useState<AppSettings | undefined>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prerequisites, setPrerequisites] = useState<PrerequisiteCheckResult>();
  const [prerequisitesLoading, setPrerequisitesLoading] = useState(true);
  const [status, setStatus] = useState("Ready");
  const [running, setRunning] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [resultsDockHeight, setResultsDockHeight] = useState(DEFAULT_RESULTS_DOCK_HEIGHT);

  const workspaceDirectory = useMemo(
    () => (document?.path ? workspaceDirectoryFromPath(document.path) : "."),
    [document?.path],
  );

  const activeConnection = useMemo(() => {
    if (!document) {
      return undefined;
    }

    return getActiveConnection(document.workspace, activeConnectionId);
  }, [document, activeConnectionId]);

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
        setActiveConnectionId(
          savedSession.workspace.connections.some(
            (connection) => connection.id === savedSession.activeConnectionId,
          )
            ? savedSession.activeConnectionId
            : savedSession.workspace.connections[0].id,
        );
        setExpression(savedSession.expression || DEFAULT_EXPRESSION);
        if (savedSession.resultsDockHeight) {
          setResultsDockHeight(savedSession.resultsDockHeight);
        }
      } else {
        const connection = createSampleConnection();
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
      }

      setSettings(loaded);
      setSessionLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!settings) {
      return;
    }

    void saveAppSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!sessionLoaded || !document) {
      return;
    }

    void saveStudioSession({
      workspacePath: document.path,
      workspace: document.workspace,
      activeConnectionId,
      expression,
      resultsDockHeight,
    });
  }, [sessionLoaded, document, activeConnectionId, expression, resultsDockHeight]);

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

  const updateWorkspace = useCallback((workspace: EfvibeWorkspace) => {
    setDocument((current) => (current ? { ...current, workspace } : current));
  }, []);

  const handleRun = useCallback(
    async (withPlan = false) => {
      if (!connectionSettings || !settings || !document) {
        setStatus("Configure a connection before running.");
        return;
      }

      if (!searchDirectory) {
        setPayload({
          success: false,
          sql: [],
          metrics: { totalMs: 0, sqlCommandCount: 0, resultKind: "error" },
          warnings: [],
          error:
            "Set a search directory or EF project in Settings so efvibe can discover your .csproj.",
        });
        setActiveTab("result");
        setStatus("Set a search directory or EF project in Settings.");
        return;
      }

      setRunning(true);
      setStatus(withPlan ? "Running with plan…" : "Running…");

      try {
        const result = await runExpressionViaDaemon(
          connectionSettings,
          searchDirectory,
          searchDirectory,
          expression,
          withPlan,
        );

        if (result.payload) {
          setPayload(result.payload);
          setActiveTab(withPlan ? "plan" : result.payload.rows?.length ? "result" : "sql");
          setStatus(
            result.payload.success
              ? `Done · ${result.payload.metrics.totalMs} ms`
              : result.payload.error ?? "Evaluation failed.",
          );
        } else {
          setPayload({
            success: false,
            sql: [],
            metrics: { totalMs: 0, sqlCommandCount: 0, resultKind: "error" },
            warnings: [],
            error: result.stdout || "No evaluation payload returned.",
          });
          setActiveTab("messages");
          setStatus("Evaluation failed.");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setPayload({
          success: false,
          sql: [],
          metrics: { totalMs: 0, sqlCommandCount: 0, resultKind: "error" },
          warnings: [],
          error: message,
        });
        setActiveTab("messages");
        setStatus(message);
      } finally {
        setRunning(false);
      }
    },
    [connectionSettings, settings, document, searchDirectory, expression],
  );

  useEffect(() => {
    const listener = () => {
      void handleRun(false);
    };

    window.addEventListener("efvibe-run-query", listener);
    return () => window.removeEventListener("efvibe-run-query", listener);
  }, [handleRun]);

  async function handleOpenWorkspace() {
    try {
      const opened = await openWorkspaceFile();
      if (!opened) {
        return;
      }

      setDocument(opened);
      setActiveConnectionId(opened.workspace.connections[0]?.id ?? "");
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
    setDocument(created);
    setActiveConnectionId(created.workspace.connections[0].id);
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

  async function handleOpenSampleSource() {
    if (!settings || !connectionSettings?.project) {
      setStatus("Set an EF project path first.");
      return;
    }

    try {
      await openInIde(
        connectionSettings.project,
        1,
        settings.preferredEditor,
        settings.customEditorCommand,
      );
      setStatus(`Opened ${connectionSettings.project}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  if (!settings || !activeConnection || !document) {
    return <main className="app loading">Loading efvibe Studio…</main>;
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <strong>efvibe Studio</strong>
          <span>{activeConnection.name}</span>
        </div>
        <div className="menu">
          <button type="button" onClick={() => void handleNewWorkspace()}>
            New
          </button>
          <button type="button" onClick={() => void handleOpenWorkspace()}>
            Open
          </button>
          <button type="button" onClick={() => void handleSaveWorkspace()}>
            Save
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
          <button type="button" onClick={() => void handleOpenSampleSource()}>
            Open in IDE
          </button>
        </div>
        <div className="runbar">
          <button type="button" disabled={running} onClick={() => void handleRun(false)}>
            Run
          </button>
          <button type="button" disabled={running} onClick={() => void handleRun(true)}>
            Run Plan
          </button>
        </div>
        <div className="status-inline" title={status}>
          {status}
        </div>
      </header>

      <PrerequisitesBanner result={prerequisites} loading={prerequisitesLoading} />

      <div className="workspace">
        <WorkspaceSidebar
          documentPath={document.path}
          workspace={document.workspace}
          activeConnectionId={activeConnectionId}
          onSelectConnection={(connectionId) => {
            setActiveConnectionId(connectionId);
            void invalidateEfvibeDaemon();
          }}
          onAddConnection={() => {
            const connection = createSampleConnection();
            updateWorkspace({
              ...document.workspace,
              connections: [...document.workspace.connections, connection],
            });
            setActiveConnectionId(connection.id);
          }}
        />

        <ResizableResultsDock
          height={resultsDockHeight}
          onHeightChange={setResultsDockHeight}
          editor={<MonacoEditor value={expression} onChange={setExpression} />}
          results={
            <ResultsTabs
              payload={payload}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onExport={(format) => void handleExport(format)}
            />
          }
        />
      </div>

      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        connection={activeConnection}
        onClose={() => setSettingsOpen(false)}
        onSettingsChange={setSettings}
        onConnectionChange={(connection) => {
          updateWorkspace({
            ...document.workspace,
            connections: document.workspace.connections.map((entry) =>
              entry.id === connection.id ? connection : entry,
            ),
          });
          void invalidateEfvibeDaemon();
        }}
      />
    </main>
  );
}

export default App;
