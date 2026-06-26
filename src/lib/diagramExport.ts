import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { runDaemonJson } from "./daemonClient";
import type { ConnectionSettings } from "../types/connection";
import type { DiagramJsonPayload } from "../types/schema";

function parseJsonLine<T>(stdout: string): T | undefined {
  const line = stdout
    .split(/\r?\n/u)
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("{"));

  if (!line) {
    return undefined;
  }

  try {
    return JSON.parse(line) as T;
  } catch {
    return undefined;
  }
}

export async function fetchDiagramJson(
  settings: ConnectionSettings,
  searchDirectory: string,
  cwd: string,
  entity?: string,
): Promise<DiagramJsonPayload | undefined> {
  const request: Record<string, string> = { type: "diagram" };

  if (entity) {
    request.entity = entity;
  }

  const line = await runDaemonJson(settings, searchDirectory, cwd, request);
  return parseJsonLine<DiagramJsonPayload>(line);
}

export async function exportErDiagramContentToFile(
  content: string,
  defaultBaseName: string,
): Promise<string | undefined> {
  const safeName = defaultBaseName.replace(/[^\w.-]+/gu, "-").replace(/^-+|-+$/gu, "") || "diagram";
  const target = await save({
    filters: [
      { name: "Mermaid", extensions: ["mmd"] },
      { name: "Markdown", extensions: ["md"] },
    ],
    defaultPath: `${safeName}-er-diagram.mmd`,
  });

  if (!target || Array.isArray(target)) {
    return undefined;
  }

  await writeTextFile(target, `${content}\n`);
  return target;
}

export async function exportErDiagramToFile(
  settings: ConnectionSettings,
  searchDirectory: string,
  cwd: string,
  defaultBaseName: string,
): Promise<string | undefined> {
  const payload = await fetchDiagramJson(settings, searchDirectory, cwd);

  if (!payload?.success || !payload.content) {
    throw new Error(payload?.error ?? "Could not build ER diagram.");
  }

  return exportErDiagramContentToFile(payload.content, defaultBaseName);
}
