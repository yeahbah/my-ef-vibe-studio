import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { QueryTab } from "../types/query";
import type { QueryLibraryState } from "../types/queryLibrary";
import { createPack, type EfvibePack, type PackQuery } from "../types/pack";
import type { SnippetDefinition } from "../types/snippets";

export async function exportTeamPack(
  name: string,
  queryTabs: QueryTab[],
  userSnippets: SnippetDefinition[],
  queryLibrary: QueryLibraryState,
): Promise<string | undefined> {
  const queries: PackQuery[] = queryTabs.map((tab) => ({
    name: tab.name,
    expression: tab.expression,
    folder: queryLibrary.folders.find((folder) => folder.id === tab.folderId)?.name,
    favorite: tab.favorite,
  }));

  const pack = createPack(name, "team-pack", {
    description: "Exported from efvibe Studio",
    snippets: userSnippets.map((snippet) => ({
      title: snippet.title,
      expression: snippet.expression,
      description: snippet.description,
    })),
    queries,
    folders: queryLibrary.folders.map((folder) => ({ name: folder.name })),
  });

  const targetPath = await save({
    filters: [{ name: "efvibe Pack", extensions: ["efvibe-pack", "json"] }],
    defaultPath: `${name.replace(/\s+/gu, "-").toLowerCase()}.efvibe-pack`,
  });

  if (!targetPath || Array.isArray(targetPath)) {
    return undefined;
  }

  await writeTextFile(targetPath, `${JSON.stringify(pack, null, 2)}\n`);
  return targetPath;
}

export async function importTeamPack(): Promise<EfvibePack | undefined> {
  const selected = await open({
    multiple: false,
    filters: [{ name: "efvibe Pack", extensions: ["efvibe-pack", "json"] }],
  });

  if (!selected || Array.isArray(selected)) {
    return undefined;
  }

  const contents = await readTextFile(selected);
  const parsed = JSON.parse(contents) as EfvibePack;
  if (parsed.version !== 1) {
    throw new Error("Unsupported pack version.");
  }

  return parsed;
}

export async function writePackToSyncDirectory(
  syncDirectory: string,
  pack: EfvibePack,
): Promise<string> {
  const normalized = syncDirectory.replace(/\/$/, "");
  const targetPath = `${normalized}/team-pack.efvibe-pack`;
  await writeTextFile(targetPath, `${JSON.stringify(pack, null, 2)}\n`);
  return targetPath;
}

export async function readPackFromSyncDirectory(
  syncDirectory: string,
): Promise<EfvibePack | undefined> {
  const normalized = syncDirectory.replace(/\/$/, "");
  const targetPath = `${normalized}/team-pack.efvibe-pack`;

  try {
    const contents = await readTextFile(targetPath);
    return JSON.parse(contents) as EfvibePack;
  } catch {
    return undefined;
  }
}

export function buildPackFromStudio(
  name: string,
  queryTabs: QueryTab[],
  userSnippets: SnippetDefinition[],
  queryLibrary: QueryLibraryState,
): EfvibePack {
  return createPack(name, "team-pack", {
    description: "Synced from efvibe Studio",
    snippets: userSnippets.map((snippet) => ({
      title: snippet.title,
      expression: snippet.expression,
      description: snippet.description,
    })),
    queries: queryTabs
      .filter((tab) => tab.favorite)
      .map((tab) => ({
        name: tab.name,
        expression: tab.expression,
        favorite: true,
        folder: queryLibrary.folders.find((folder) => folder.id === tab.folderId)?.name,
      })),
    folders: queryLibrary.folders.map((folder) => ({ name: folder.name })),
  });
}

export function applyImportedPack(
  pack: EfvibePack,
  activeConnectionId: string,
): {
  snippets: SnippetDefinition[];
  queries: Array<{ name: string; expression: string; connectionId: string }>;
  folderNames: string[];
} {
  const snippets = pack.snippets.map((snippet) => ({
    id: crypto.randomUUID(),
    title: snippet.title,
    expression: snippet.expression,
    description: snippet.description,
    builtin: false,
  }));

  const queries = pack.queries.map((query) => ({
    name: query.name,
    expression: query.expression,
    connectionId: activeConnectionId,
  }));

  return {
    snippets,
    queries,
    folderNames: pack.folders.map((folder) => folder.name),
  };
}
