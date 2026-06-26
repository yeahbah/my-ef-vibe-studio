import { invoke } from "@tauri-apps/api/core";
import { revealItemInDir } from "@tauri-apps/plugin-opener";

let cachedFileManagerLabel: string | undefined;

export async function getFileManagerLabel(): Promise<string> {
  if (cachedFileManagerLabel) {
    return cachedFileManagerLabel;
  }

  cachedFileManagerLabel = await invoke<string>("file_manager_label");
  return cachedFileManagerLabel;
}

export function formatShowInFileManagerLabel(fileManagerLabel: string): string {
  return `Show in ${fileManagerLabel}`;
}

export async function showWorkspaceInFileManager(documentPath: string): Promise<void> {
  const path = documentPath.trim();
  if (!path) {
    throw new Error("Save the workspace first to reveal it in your file manager.");
  }

  await revealItemInDir(path);
}
