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
  /** Optional directory for resolving #load paths (defaults to search directory). */
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

export function resolveSearchDirectory(
  connection: WorkspaceConnection,
  workspaceDirectory: string,
  resolvedProject: string,
): string {
  const resolvePath = (value: string | undefined) => {
    if (!value?.trim()) {
      return "";
    }

    if (value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value)) {
      return value;
    }

    return `${workspaceDirectory.replace(/\/$/, "")}/${value.replace(/^\.\//, "")}`;
  };

  if (resolvedProject) {
    const normalized = resolvedProject.replace(/\\/g, "/");
    const index = normalized.lastIndexOf("/");
    if (index >= 0) {
      return normalized.slice(0, index);
    }
  }

  const configured = resolvePath(connection.searchDirectory);
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
  const resolvePath = (value: string | undefined) => {
    if (!value?.trim()) {
      return "";
    }

    if (value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value)) {
      return value;
    }

    return `${workspaceDirectory.replace(/\/$/, "")}/${value.replace(/^\.\//, "")}`;
  };

  return {
    workspaceRoot: resolvePath(connection.workspaceRoot) || defaultWorkspaceRoot,
    project: resolvePath(connection.efProject),
    startupProject: resolvePath(connection.startupProject),
    context: connection.context ?? "",
    connectionString: connection.connectionString ?? "",
    toolPath,
    dbLog: connection.dbLog ?? true,
    dotnetFramework: connection.dotnetFramework ?? "",
    scriptSearchPath: resolvePath(connection.scriptSearchPath),
    scriptLoads: connection.scriptLoads ?? [],
    scriptUsings: connection.scriptUsings ?? [],
  };
}
