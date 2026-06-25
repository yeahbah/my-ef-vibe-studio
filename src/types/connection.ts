export interface ConnectionSettings {
  workspaceRoot: string;
  project: string;
  startupProject: string;
  context: string;
  connectionString: string;
  toolPath: string;
  dbLog: boolean;
  dotnetFramework: string;
}

export type PreferredEditor = "code" | "rider" | "devenv" | "custom";

export interface AppSettings {
  toolPath: string;
  defaultWorkspaceRoot: string;
  preferredEditor: PreferredEditor;
  customEditorCommand: string;
  teamSyncDirectory: string;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  toolPath: "",
  defaultWorkspaceRoot: "",
  preferredEditor: "code",
  customEditorCommand: "",
  teamSyncDirectory: "",
};

export interface ToolInvocation {
  kind: "path" | "dotnet-tool" | "global";
  command: string;
  prefixArgs: string[];
  framework?: string;
}

export interface PrerequisiteCheckResult {
  ok: boolean;
  dotnet: { found: boolean; version?: string; error?: string };
  efvibe: {
    found: boolean;
    version?: string;
    error?: string;
    invocation: ToolInvocation;
  };
}
