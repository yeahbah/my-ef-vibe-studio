import { invoke } from "@tauri-apps/api/core";

export const STUDIO_WINDOW_TITLE = "My EF Vibe Studio";

export async function setWindowTitle(title: string): Promise<void> {
  globalThis.document.title = title;
  await invoke("set_window_title", { title });
}

export function formatStudioWindowTitle(connectionName: string): string {
  const trimmed = connectionName.trim();
  return `${STUDIO_WINDOW_TITLE} - ${trimmed || "Unnamed"}`;
}
