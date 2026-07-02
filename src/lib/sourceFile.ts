import { exists, readTextFile } from "@tauri-apps/plugin-fs";
import { ensureFsScopeForPath } from "./fsScope";

export async function loadSourceFile(filePath: string): Promise<string> {
  const normalized = filePath.trim();

  if (!normalized) {
    throw new Error("No source file path.");
  }

  await ensureFsScopeForPath(normalized);

  if (!(await exists(normalized))) {
    throw new Error(`File not found: ${normalized}`);
  }

  return readTextFile(normalized);
}

export function sourceFileLabel(filePath: string): string {
  const normalized = filePath.replace(/\\/gu, "/");
  const segments = normalized.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? normalized;
}
