import type { KeybindingSettings } from "./keybindings";
import type { AppTheme } from "./theme";

export interface ConnectionSettings {
  workspaceRoot: string;
  workspaceFileDirectory: string;
  project: string;
  startupProject: string;
  context: string;
  connectionString: string;
  toolPath: string;
  dbLog: boolean;
  dotnetFramework: string;
  scriptSearchPath?: string;
  scriptLoads?: string[];
  scriptUsings?: string[];
}

export type PreferredEditor = "code" | "rider" | "devenv" | "custom";

export interface AppSettings {
  toolPath: string;
  defaultWorkspaceRoot: string;
  preferredEditor: PreferredEditor;
  customEditorCommand: string;
  teamSyncDirectory: string;
  /** Optional folder for cloud-backed query sync (Dropbox, iCloud Drive, etc.). */
  cloudSyncDirectory?: string;
  theme?: AppTheme;
  /** When true, connection strings are stored in the OS-backed vault instead of workspace files. */
  vaultConnectionSecrets?: boolean;
  keybindings?: Partial<KeybindingSettings>;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  toolPath: "",
  defaultWorkspaceRoot: "",
  preferredEditor: "code",
  customEditorCommand: "",
  teamSyncDirectory: "",
  cloudSyncDirectory: "",
  vaultConnectionSecrets: true,
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
