import { invoke } from "@tauri-apps/api/core";
import type { EfvibeWorkspace } from "../types/workspace";
import { resolveScriptSearchPath, resolveSearchDirectory } from "../types/workspace";

const allowedDirectories = new Set<string>();

function normalizeDirectory(value: string): string {
  return value.trim().replace(/\\/gu, "/").replace(/\/$/u, "");
}

function parentDirectory(filePath: string): string | undefined {
  const normalized = normalizeDirectory(filePath);
  const index = normalized.lastIndexOf("/");
  return index >= 0 ? normalized.slice(0, index) : undefined;
}

function looksLikeFilePath(value: string): boolean {
  const segment = value.split("/").pop() ?? "";
  return segment.includes(".");
}

function addScopeDirectory(directories: Set<string>, value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === ".") {
    return;
  }

  if (looksLikeFilePath(trimmed)) {
    const parent = parentDirectory(trimmed);
    if (parent) {
      directories.add(parent);
      return;
    }
  }

  directories.add(trimmed);
}

export function collectWorkspaceScopeDirectories(
  workspaceDirectory: string,
  workspace: EfvibeWorkspace,
): string[] {
  const directories = new Set<string>();

  addScopeDirectory(directories, workspaceDirectory);

  for (const project of workspace.projects) {
    addScopeDirectory(directories, project.path);
  }

  for (const connection of workspace.connections) {
    addScopeDirectory(directories, connection.searchDirectory);
    addScopeDirectory(directories, connection.workspaceRoot);
    addScopeDirectory(directories, connection.efProject);
    addScopeDirectory(directories, connection.startupProject);
    addScopeDirectory(
      directories,
      resolveScriptSearchPath(connection, workspaceDirectory),
    );
    addScopeDirectory(
      directories,
      resolveSearchDirectory(connection, workspaceDirectory, connection.efProject),
    );
    addScopeDirectory(
      directories,
      resolveSearchDirectory(
        connection,
        workspaceDirectory,
        connection.startupProject ?? "",
      ),
    );
  }

  return [...directories];
}

export async function ensureFsDirectoryScope(directory: string): Promise<void> {
  const normalized = normalizeDirectory(directory);
  if (!normalized || normalized === ".") {
    return;
  }

  if (allowedDirectories.has(normalized)) {
    return;
  }

  await invoke("allow_fs_directory", { directory: normalized });
  allowedDirectories.add(normalized);
}

export async function ensureFsScopeForPath(filePath: string): Promise<void> {
  const parent = parentDirectory(filePath);
  if (parent) {
    await ensureFsDirectoryScope(parent);
  }
}

export async function ensureWorkspaceFsScope(
  workspaceDirectory: string,
  workspace: EfvibeWorkspace,
): Promise<void> {
  const directories = collectWorkspaceScopeDirectories(workspaceDirectory, workspace);
  await Promise.all(directories.map((directory) => ensureFsDirectoryScope(directory)));
}
