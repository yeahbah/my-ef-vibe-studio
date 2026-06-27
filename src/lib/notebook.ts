import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import {
  createDefaultNotebook,
  createNotebookCell,
  notebookCellFromFile,
  type NotebookCell,
} from "../types/notebook";
import type { EfvibeNotebookFile } from "../types/notebook";

export function splitLegacyNotebook(text: string): NotebookCell[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return createDefaultNotebook("");
  }

  try {
    const parsed = JSON.parse(trimmed) as EfvibeNotebookFile;
    if (parsed.cells?.length) {
      return parsed.cells.map((cell) => notebookCellFromFile(cell));
    }
  } catch {
    // Fall through to --- separated cells.
  }

  return trimmed
    .split(/\n---\n/u)
    .map((value) => createNotebookCell("code", value.trim()))
    .filter((cell) => cell.value.length > 0);
}

export async function openNotebookFile(connectionId: string): Promise<
  | {
      name: string;
      path: string;
      cells: NotebookCell[];
      connectionId: string;
    }
  | undefined
> {
  const selected = await open({
    multiple: false,
    filters: [{ name: "efvibe Notebook", extensions: ["efvibe-notebook", "json"] }],
  });

  if (!selected || Array.isArray(selected)) {
    return undefined;
  }

  const contents = await readTextFile(selected);
  const fileName = selected.split(/[/\\]/).pop()?.replace(/\.efvibe-notebook$/i, "") ?? "Notebook";

  try {
    const parsed = JSON.parse(contents) as EfvibeNotebookFile;
    return {
      name: parsed.name || fileName,
      path: selected,
      connectionId: parsed.connectionId || connectionId,
      cells: parsed.cells?.length
        ? parsed.cells.map((cell) => notebookCellFromFile(cell))
        : createDefaultNotebook(connectionId),
    };
  } catch {
    return {
      name: fileName,
      path: selected,
      connectionId,
      cells: splitLegacyNotebook(contents),
    };
  }
}

export async function saveNotebookFile(
  name: string,
  path: string,
  connectionId: string,
  cells: NotebookCell[],
): Promise<string> {
  const targetPath =
    path ||
    (await save({
      filters: [{ name: "efvibe Notebook", extensions: ["efvibe-notebook"] }],
      defaultPath: `${name || "notebook"}.efvibe-notebook`,
    }));

  if (!targetPath || Array.isArray(targetPath)) {
    throw new Error("Save cancelled.");
  }

  const payload: EfvibeNotebookFile = {
    version: 1,
    name,
    connectionId,
    cells: cells.map((cell) => ({
      kind: cell.kind,
      value: cell.value,
      lastPayload: cell.lastPayload,
      activeResultsTab: cell.activeResultsTab,
      markdownOutput: cell.markdownOutput,
    })),
  };

  await writeTextFile(targetPath, `${JSON.stringify(payload, null, 2)}\n`);
  return targetPath;
}
