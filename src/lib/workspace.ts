import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { stripConnectionSecretsForSave } from "./connectionVault";
import type { EfvibeWorkspace } from "../types/workspace";
import { createEmptyWorkspace } from "../types/workspace";

export interface SaveWorkspaceOptions {
  stripConnectionSecrets?: boolean;
}

export interface WorkspaceDocument {
  path: string;
  workspace: EfvibeWorkspace;
}

export async function openWorkspaceFile(): Promise<WorkspaceDocument | undefined> {
  const selected = await open({
    multiple: false,
    filters: [{ name: "efvibe Workspace", extensions: ["efvibe-workspace", "json"] }],
  });

  if (!selected || Array.isArray(selected)) {
    return undefined;
  }

  const contents = await readTextFile(selected);
  const workspace = JSON.parse(contents) as EfvibeWorkspace;

  return {
    path: selected,
    workspace,
  };
}

export async function saveWorkspaceFile(
  document: WorkspaceDocument,
  options?: SaveWorkspaceOptions,
): Promise<WorkspaceDocument> {
  const targetPath =
    document.path ||
    (await save({
      filters: [{ name: "efvibe Workspace", extensions: ["efvibe-workspace"] }],
      defaultPath: `${document.workspace.name || "workspace"}.efvibe-workspace`,
    }));

  if (!targetPath || Array.isArray(targetPath)) {
    throw new Error("Save cancelled.");
  }

  const workspaceToWrite = options?.stripConnectionSecrets
    ? stripConnectionSecretsForSave(document.workspace)
    : document.workspace;
  const payload = `${JSON.stringify(workspaceToWrite, null, 2)}\n`;
  await writeTextFile(targetPath, payload);

  return {
    path: targetPath,
    workspace: document.workspace,
  };
}

export async function createNewWorkspace(name?: string): Promise<WorkspaceDocument> {
  return {
    path: "",
    workspace: createEmptyWorkspace(name),
  };
}

export function workspaceDirectoryFromPath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const index = normalized.lastIndexOf("/");
  return index >= 0 ? normalized.slice(0, index) : ".";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseWorkspaceFromJson(text: string): EfvibeWorkspace {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Invalid JSON");
  }

  if (!isRecord(parsed)) {
    throw new Error("Workspace must be a JSON object.");
  }

  if (parsed.version !== 1) {
    throw new Error('Workspace "version" must be 1.');
  }

  if (typeof parsed.name !== "string") {
    throw new Error('Workspace "name" must be a string.');
  }

  if (!Array.isArray(parsed.projects)) {
    throw new Error('Workspace "projects" must be an array.');
  }

  if (!Array.isArray(parsed.connections)) {
    throw new Error('Workspace "connections" must be an array.');
  }

  for (const [index, project] of parsed.projects.entries()) {
    if (!isRecord(project) || typeof project.path !== "string") {
      throw new Error(`projects[${index}].path must be a string.`);
    }
  }

  for (const [index, connection] of parsed.connections.entries()) {
    if (!isRecord(connection)) {
      throw new Error(`connections[${index}] must be an object.`);
    }

    if (typeof connection.id !== "string" || !connection.id.trim()) {
      throw new Error(`connections[${index}].id must be a non-empty string.`);
    }

    if (typeof connection.name !== "string") {
      throw new Error(`connections[${index}].name must be a string.`);
    }

    if (typeof connection.efProject !== "string") {
      throw new Error(`connections[${index}].efProject must be a string.`);
    }

    if (typeof connection.context !== "string") {
      throw new Error(`connections[${index}].context must be a string.`);
    }
  }

  return {
    version: 1,
    name: parsed.name,
    projects: parsed.projects as EfvibeWorkspace["projects"],
    connections: parsed.connections as EfvibeWorkspace["connections"],
  };
}

export function formatWorkspaceJson(workspace: EfvibeWorkspace): string {
  return `${JSON.stringify(workspace, null, 2)}\n`;
}
