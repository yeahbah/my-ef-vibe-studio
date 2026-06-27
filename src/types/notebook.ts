import type { EvaluationJsonPayload } from "./evaluation";
import type { ResultsTab } from "./query";

export type NotebookCellExecutionStatus = "idle" | "running" | "success" | "error";

export interface NotebookCell {
  id: string;
  kind: "code" | "markdown";
  value: string;
  lastPayload?: EvaluationJsonPayload;
  activeResultsTab?: ResultsTab;
  executionStatus?: NotebookCellExecutionStatus;
  /** Command-cell output rendered as markdown tables. */
  markdownOutput?: boolean;
}

export interface EfvibeNotebookFile {
  version: 1;
  name: string;
  connectionId: string;
  cells: Array<{
    kind: "code" | "markdown";
    value: string;
    lastPayload?: EvaluationJsonPayload;
    activeResultsTab?: ResultsTab;
    markdownOutput?: boolean;
  }>;
}

export function createNotebookCell(kind: "code" | "markdown" = "code", value = ""): NotebookCell {
  return {
    id: crypto.randomUUID(),
    kind,
    value,
    executionStatus: "idle",
  };
}

export function createDefaultNotebook(_connectionId?: string): NotebookCell[] {
  return [
    createNotebookCell(
      "markdown",
      "# efvibe notebook\nRun LINQ cells against the configured DbContext.",
    ),
    createNotebookCell("code", "db.Products.Take(10)"),
    createNotebookCell("code", ":dbinfo"),
  ];
}

export function notebookCellFromFile(
  cell: EfvibeNotebookFile["cells"][number],
): NotebookCell {
  return {
    id: crypto.randomUUID(),
    kind: cell.kind,
    value: cell.value,
    lastPayload: cell.lastPayload,
    activeResultsTab: cell.activeResultsTab,
    markdownOutput: cell.markdownOutput,
    executionStatus: cell.lastPayload
      ? cell.lastPayload.success
        ? "success"
        : "error"
      : "idle",
  };
}
