export interface WorkspaceProject {
  path: string;
}

export interface WorkspaceConnection {
  id: string;
  name: string;
  efProject: string;
  startupProject?: string;
  context: string;
  searchDirectory?: string;
  workspaceRoot?: string;
  connectionString?: string;
  dotnetFramework?: string;
  dbLog?: boolean;
  /** Optional directory for resolving #load paths (defaults to `scripts` beside the workspace file). */
  scriptSearchPath?: string;
  /** Script files to load when the session starts (workspace-relative or absolute). */
  scriptLoads?: string[];
  /** Extra namespaces imported into every query for this connection. */
  scriptUsings?: string[];
}

export interface EfvibeWorkspace {
  version: 1;
  name: string;
  projects: WorkspaceProject[];
  connections: WorkspaceConnection[];
}

export function createEmptyWorkspace(name = "Untitled workspace"): EfvibeWorkspace {
  return {
    version: 1,
    name,
    projects: [],
    connections: [],
  };
}

export function createSampleConnection(name?: string): WorkspaceConnection {
  return {
    id: crypto.randomUUID(),
    name: name ?? "Default connection",
    efProject: "",
    startupProject: "",
    context: "",
    dbLog: true,
  };
}

export function duplicateConnection(connection: WorkspaceConnection): WorkspaceConnection {
  return {
    ...connection,
    id: crypto.randomUUID(),
    name: `${connection.name} (copy)`,
  };
}

export function getActiveConnection(
  workspace: EfvibeWorkspace,
  activeConnectionId: string,
): WorkspaceConnection | undefined {
  return workspace.connections.find((connection) => connection.id === activeConnectionId);
}

export function connectionDisplayName(connection: WorkspaceConnection): string {
  const name = connection.name.trim();
  if (name) {
    return name;
  }

  const context = connection.context.trim();
  if (context) {
    return context;
  }

  return "Unnamed";
}

/** Default folder for `.csx` helpers, relative to the workspace file directory. */
export const DEFAULT_SCRIPT_SEARCH_PATH = "scripts";

function resolveWorkspaceRelativePath(
  value: string | undefined,
  workspaceDirectory: string,
): string {
  if (!value?.trim()) {
    return "";
  }

  if (value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value)) {
    return value;
  }

  return `${workspaceDirectory.replace(/\/$/, "")}/${value.replace(/^\.\//, "")}`;
}

export function resolveScriptSearchPath(
  connection: WorkspaceConnection,
  workspaceDirectory: string,
): string {
  return (
    resolveWorkspaceRelativePath(connection.scriptSearchPath, workspaceDirectory) ||
    resolveWorkspaceRelativePath(DEFAULT_SCRIPT_SEARCH_PATH, workspaceDirectory)
  );
}

export function resolveSearchDirectory(
  connection: WorkspaceConnection,
  workspaceDirectory: string,
  resolvedProject: string,
): string {
  if (resolvedProject) {
    const normalized = resolvedProject.replace(/\\/g, "/");
    const index = normalized.lastIndexOf("/");
    if (index >= 0) {
      return normalized.slice(0, index);
    }
  }

  const configured = resolveWorkspaceRelativePath(connection.searchDirectory, workspaceDirectory);
  if (configured) {
    return configured;
  }

  if (workspaceDirectory !== ".") {
    return workspaceDirectory;
  }

  return "";
}

export function workspaceConnectionToSettings(
  connection: WorkspaceConnection,
  workspaceDirectory: string,
  toolPath: string,
  defaultWorkspaceRoot: string,
): import("./connection").ConnectionSettings {
  const configuredScriptSearchPath = connection.scriptSearchPath?.trim();
  const scriptSearchPath = configuredScriptSearchPath || DEFAULT_SCRIPT_SEARCH_PATH;

  return {
    workspaceRoot:
      resolveWorkspaceRelativePath(connection.workspaceRoot, workspaceDirectory) ||
      defaultWorkspaceRoot,
    workspaceFileDirectory: workspaceDirectory !== "." ? workspaceDirectory : "",
    project: resolveWorkspaceRelativePath(connection.efProject, workspaceDirectory),
    startupProject: resolveWorkspaceRelativePath(connection.startupProject, workspaceDirectory),
    context: connection.context ?? "",
    connectionString: connection.connectionString ?? "",
    toolPath,
    dbLog: connection.dbLog ?? true,
    dotnetFramework: connection.dotnetFramework ?? "",
    scriptSearchPath,
    scriptLoads: connection.scriptLoads ?? [],
    scriptUsings: (connection.scriptUsings ?? []).map(normalizeScriptUsing),
  };
}

function normalizeScriptUsing(value: string): string {
  let trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (trimmed.endsWith(";")) {
    trimmed = trimmed.slice(0, -1).trimEnd();
  }

  if (/^using\s+/iu.test(trimmed)) {
    trimmed = trimmed.replace(/^using\s+/iu, "").trim();
  }

  if (/^global\s+using\s+/iu.test(trimmed)) {
    trimmed = trimmed.replace(/^global\s+using\s+/iu, "").trim();
  }

  return trimmed;
}
