import { invoke } from "@tauri-apps/api/core";
import { mkdir, writeTextFile } from "@tauri-apps/plugin-fs";
import { createSinglePaneLayout } from "../queryPaneLayout";
import { notebookCellFromFile } from "../../types/notebook";
import { createQueryTab } from "../../types/query";
import type { EfvibeNotebookFile } from "../../types/notebook";
import type { EfvibeQueryFile } from "../../types/query";
import type { EfvibeWorkspace } from "../../types/workspace";
import type { QueryTab } from "../../types/query";
import type { NotebookCell } from "../../types/notebook";
import type { PaneLayoutNode } from "../../types/queryPaneLayout";
import {
  SAMPLE_CONNECTION_ID,
  SAMPLE_NOTEBOOK,
  SAMPLE_QUERIES,
  SAMPLE_REPO_FOLDER,
  SAMPLE_SCRIPT_FILES,
  SAMPLE_STUDIO_FOLDER,
  SAMPLE_WORKSPACE_NAME,
  buildSampleWorkspaceJson,
} from "./content";

export interface ProvisionedSampleWorkspace {
  repoRoot: string;
  studioRoot: string;
  workspacePath: string;
  workspace: EfvibeWorkspace;
  connectionId: string;
  queryTabs: QueryTab[];
  activeQueryTabId: string;
  paneLayout: PaneLayoutNode;
  notebookName: string;
  notebookPath: string;
  notebookCells: NotebookCell[];
}

function joinPath(base: string, ...segments: string[]): string {
  const normalizedBase = base.replace(/\\/g, "/").replace(/\/$/, "");
  const tail = segments
    .map((segment) => segment.replace(/\\/g, "/").replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");

  return tail ? `${normalizedBase}/${tail}` : normalizedBase;
}

async function writeText(path: string, content: string): Promise<void> {
  const payload = content.endsWith("\n") ? content : `${content}\n`;
  await writeTextFile(path, payload);
}

export function getSampleParentDirectory(defaultWorkspaceRoot: string): string {
  const trimmed = defaultWorkspaceRoot.trim().replace(/\\/g, "/").replace(/\/$/, "");
  return joinPath(trimmed || ".", "samples");
}

export async function provisionSampleWorkspace(
  defaultWorkspaceRoot: string,
): Promise<ProvisionedSampleWorkspace> {
  const parentDirectory = getSampleParentDirectory(defaultWorkspaceRoot);
  const repoRoot = await invoke<string>("clone_adventureworks_sqlite", {
    parentDirectory,
  });

  const studioRoot = joinPath(repoRoot, SAMPLE_STUDIO_FOLDER);
  const scriptsRoot = joinPath(studioRoot, "scripts");
  const queriesRoot = joinPath(studioRoot, "queries");
  const notebooksRoot = joinPath(studioRoot, "notebooks");
  const workspacePath = joinPath(studioRoot, "adventureworks.efvibe-workspace");

  await mkdir(scriptsRoot, { recursive: true });
  await mkdir(queriesRoot, { recursive: true });
  await mkdir(notebooksRoot, { recursive: true });

  for (const script of SAMPLE_SCRIPT_FILES) {
    await writeText(joinPath(scriptsRoot, script.fileName), script.content);
  }

  const queryTabs: QueryTab[] = [];

  for (const sample of SAMPLE_QUERIES) {
    const filePath = joinPath(queriesRoot, sample.fileName);
    const payload: EfvibeQueryFile = {
      version: 1,
      name: sample.name,
      connectionId: SAMPLE_CONNECTION_ID,
      expression: sample.expression,
    };

    await writeText(filePath, JSON.stringify(payload, null, 2));

    queryTabs.push(
      createQueryTab(SAMPLE_CONNECTION_ID, {
        name: sample.name,
        expression: sample.expression,
        filePath,
      }),
    );
  }

  const notebookPath = joinPath(notebooksRoot, SAMPLE_NOTEBOOK.fileName);
  const notebookPayload: EfvibeNotebookFile = {
    version: 1,
    name: SAMPLE_NOTEBOOK.name,
    connectionId: SAMPLE_CONNECTION_ID,
    cells: SAMPLE_NOTEBOOK.cells,
  };

  await writeText(notebookPath, JSON.stringify(notebookPayload, null, 2));

  await writeText(workspacePath, buildSampleWorkspaceJson(SAMPLE_CONNECTION_ID));

  const workspace = JSON.parse(buildSampleWorkspaceJson(SAMPLE_CONNECTION_ID)) as EfvibeWorkspace;
  const activeQueryTabId = queryTabs[0]?.id ?? "";
  const paneLayout = createSinglePaneLayout(
    queryTabs.map((tab) => tab.id),
    activeQueryTabId,
  );

  return {
    repoRoot,
    studioRoot,
    workspacePath,
    workspace,
    connectionId: SAMPLE_CONNECTION_ID,
    queryTabs,
    activeQueryTabId,
    paneLayout,
    notebookName: SAMPLE_NOTEBOOK.name,
    notebookPath,
    notebookCells: SAMPLE_NOTEBOOK.cells.map((cell) => notebookCellFromFile(cell)),
  };
}

export function sampleWorkspaceDetail(repoRoot: string): string {
  const folder = repoRoot.replace(/\\/g, "/").split("/").pop() ?? SAMPLE_REPO_FOLDER;
  return `${folder}/${SAMPLE_STUDIO_FOLDER}\n${SAMPLE_WORKSPACE_NAME}`;
}
