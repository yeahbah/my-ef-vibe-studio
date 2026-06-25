import { LazyStore } from "@tauri-apps/plugin-store";
import type { AppSettings } from "../types/connection";
import { DEFAULT_APP_SETTINGS } from "../types/connection";
import type { EfvibeWorkspace } from "../types/workspace";

const store = new LazyStore("settings.json");

export interface StudioSession {
  workspacePath: string;
  workspace: EfvibeWorkspace;
  activeConnectionId: string;
  expression: string;
  resultsDockHeight?: number;
}

export async function loadAppSettings(): Promise<AppSettings> {
  const saved = await store.get<AppSettings>("app");
  return {
    ...DEFAULT_APP_SETTINGS,
    ...(saved ?? {}),
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
