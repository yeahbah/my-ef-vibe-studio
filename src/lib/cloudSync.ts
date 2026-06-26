import { mkdir, readDir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { QueryTab } from "../types/query";
import type { EfvibeQueryFile } from "../types/query";
import type { QueryLibraryState } from "../types/queryLibrary";
import type { SnippetDefinition } from "../types/snippets";
import { buildPackFromStudio, readPackFromSyncDirectory, writePackToSyncDirectory } from "./pack";
import type { EfvibePack } from "../types/pack";

export const CLOUD_QUERIES_SUBDIR = "queries";
export const CLOUD_PACK_FILENAME = "studio-cloud.efvibe-pack";

export interface CloudQueryImport {
  name: string;
  expression: string;
  connectionId: string;
}

function normalizeRoot(directory: string): string {
  return directory.replace(/\/$/, "");
}

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");

  return slug || "query";
}

async function ensureQueriesDirectory(cloudSyncDirectory: string): Promise<string> {
  const queriesDir = `${normalizeRoot(cloudSyncDirectory)}/${CLOUD_QUERIES_SUBDIR}`;
  await mkdir(queriesDir, { recursive: true });
  return queriesDir;
}

export async function pushCloudSync(
  cloudSyncDirectory: string,
  queryTabs: QueryTab[],
  userSnippets: SnippetDefinition[],
  queryLibrary: QueryLibraryState,
  activeConnectionId: string,
): Promise<{ queryCount: number; packPath: string }> {
  const root = normalizeRoot(cloudSyncDirectory);
  const favorites = queryTabs.filter((tab) => tab.favorite);
  const queriesDir = await ensureQueriesDirectory(root);

  for (const tab of favorites) {
    const payload: EfvibeQueryFile = {
      version: 1,
      name: tab.name,
      connectionId: tab.connectionId || activeConnectionId,
      expression: tab.expression,
    };
    const fileName = `${slugify(tab.name)}.efvibe-query`;
    await writeTextFile(`${queriesDir}/${fileName}`, `${JSON.stringify(payload, null, 2)}\n`);
  }

  const pack = buildPackFromStudio("studio-cloud", queryTabs, userSnippets, queryLibrary);
  const packPath = await writePackToSyncDirectory(root, pack, CLOUD_PACK_FILENAME);

  return {
    queryCount: favorites.length,
    packPath,
  };
}

export async function pullCloudSync(
  cloudSyncDirectory: string,
  activeConnectionId: string,
): Promise<{
  queries: CloudQueryImport[];
  pack?: EfvibePack;
}> {
  const root = normalizeRoot(cloudSyncDirectory);
  const queriesDir = `${root}/${CLOUD_QUERIES_SUBDIR}`;
  const queries: CloudQueryImport[] = [];

  try {
    const entries = await readDir(queriesDir);
    for (const entry of entries) {
      if (!entry.isFile || !entry.name.endsWith(".efvibe-query")) {
        continue;
      }

      const contents = await readTextFile(`${queriesDir}/${entry.name}`);
      const file = JSON.parse(contents) as EfvibeQueryFile;
      if (file.version !== 1 || !file.expression?.trim()) {
        continue;
      }

      queries.push({
        name: file.name || entry.name.replace(/\.efvibe-query$/i, ""),
        expression: file.expression,
        connectionId: file.connectionId || activeConnectionId,
      });
    }
  } catch {
    // queries folder may not exist yet
  }

  const pack = await readPackFromSyncDirectory(root, CLOUD_PACK_FILENAME);

  return {
    queries,
    pack,
  };
}
