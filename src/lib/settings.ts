import { LazyStore } from "@tauri-apps/plugin-store";
import type { AppSettings } from "../types/connection";
import { DEFAULT_APP_SETTINGS } from "../types/connection";
import { DEFAULT_APP_THEME } from "../types/theme";
import type { EfvibeWorkspace } from "../types/workspace";

const store = new LazyStore("settings.json");

import type { EvaluationHistoryEntry } from "./history";
import type { QueryTab } from "../types/query";
import type { AppMainView } from "../types/mainView";
import type { NotebookCell } from "../types/notebook";
import type { SnippetDefinition } from "../types/snippets";
import type { PaneLayoutNode } from "../types/queryPaneLayout";
import type { QueryLibraryState } from "../types/queryLibrary";

export type SidebarTab =
  | "connections"
  | "schema"
  | "history"
  | "scan"
  | "library"
  | "snippets"
  | "team";

export interface StudioSession {
  workspacePath: string;
  workspace: EfvibeWorkspace;
  activeConnectionId: string;
  queryTabs: QueryTab[];
  activeQueryTabId: string;
  paneLayout?: PaneLayoutNode;
  focusedPaneId?: string;
  resultsDockHeight?: number;
  /** @deprecated Use explorerExpandedNodes */
  sidebarTab?: SidebarTab;
  explorerExpandedNodes?: string[];
  history?: EvaluationHistoryEntry[];
  mainView?: AppMainView;
  /** @deprecated Use mainView */
  notebookOpen?: boolean;
  notebookName?: string;
  notebookPath?: string;
  notebookConnectionId?: string;
  diagramConnectionId?: string;
  notebookCells?: NotebookCell[];
  liveSqlEnabled?: boolean;
  sqlPaneOpen?: boolean;
  sqlPaneWidth?: number;
  sqlPreviewAuto?: boolean;
  editorToolPanelWidth?: number;
  lambdaMode?: boolean;
  userSnippets?: SnippetDefinition[];
  queryLibrary?: QueryLibraryState;
  installedPackIds?: string[];
  explorerOpen?: boolean;
  explorerWidth?: number;
}

export async function loadAppSettings(): Promise<AppSettings> {
  const saved = await store.get<AppSettings>("app");
  return {
    ...DEFAULT_APP_SETTINGS,
    ...(saved ?? {}),
    theme: saved?.theme ?? DEFAULT_APP_THEME,
  };
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  await store.set("app", settings);
  await store.save();
}

export async function loadStudioSession(): Promise<StudioSession | undefined> {
  return store.get<StudioSession>("session");
}

export async function saveStudioSession(session: StudioSession): Promise<void> {
  await store.set("session", session);
  await store.save();
}

export function getDefaultWorkspaceRoot(homeDirectory: string): string {
  return `${homeDirectory.replace(/\/$/, "")}/.efvibe`;
}
