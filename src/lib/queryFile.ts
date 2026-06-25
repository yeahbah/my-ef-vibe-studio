import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { EfvibeQueryFile, QueryTab } from "../types/query";

export async function openQueryFile(): Promise<QueryTab | undefined> {
  const selected = await open({
    multiple: false,
    filters: [{ name: "efvibe Query", extensions: ["efvibe-query", "json"] }],
  });

  if (!selected || Array.isArray(selected)) {
    return undefined;
  }

  const contents = await readTextFile(selected);
  const file = JSON.parse(contents) as EfvibeQueryFile;
  const fileName = selected.split(/[/\\]/).pop()?.replace(/\.efvibe-query$/i, "") ?? "Query";

  return {
    id: crypto.randomUUID(),
    name: file.name || fileName,
    connectionId: file.connectionId,
    expression: file.expression,
    filePath: selected,
    activeResultsTab: "result",
  };
}

export async function saveQueryFile(tab: QueryTab, connectionId: string): Promise<QueryTab> {
  const targetPath =
    tab.filePath ||
    (await save({
      filters: [{ name: "efvibe Query", extensions: ["efvibe-query"] }],
      defaultPath: `${tab.name || "query"}.efvibe-query`,
    }));

  if (!targetPath || Array.isArray(targetPath)) {
    throw new Error("Save cancelled.");
  }

  const payload: EfvibeQueryFile = {
    version: 1,
    name: tab.name,
    connectionId,
    expression: tab.expression,
  };

  await writeTextFile(targetPath, `${JSON.stringify(payload, null, 2)}\n`);

  return {
    ...tab,
    filePath: targetPath,
  };
}
