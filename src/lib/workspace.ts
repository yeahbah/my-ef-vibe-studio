import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { EfvibeWorkspace } from "../types/workspace";
import { createEmptyWorkspace } from "../types/workspace";

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

  const payload = `${JSON.stringify(document.workspace, null, 2)}\n`;
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
