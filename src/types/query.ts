import type { EvaluationJsonPayload } from "./evaluation";
import { sourceFileLabel } from "../lib/sourceFile";

export type ResultsTab = "result" | "sql" | "plan" | "messages";

export type LegacyResultsTab = ResultsTab | "explorer" | "compare";

export function normalizeResultsTab(tab: LegacyResultsTab | undefined): ResultsTab {
  if (!tab || tab === "explorer" || tab === "compare") {
    return "result";
  }

  return tab;
}

export type QueryTabKind = "query" | "source";

export interface QueryTab {
  id: string;
  name: string;
  kind?: QueryTabKind;
  connectionId: string;
  expression: string;
  filePath: string;
  sourceFilePath?: string;
  sourceLine?: number;
  favorite?: boolean;
  folderId?: string;
  activeResultsTab: ResultsTab;
  lastPayload?: EvaluationJsonPayload;
  /** Snapshot of result rows after the last successful query run (for grid save diffs). */
  resultRowsBaseline?: Array<Record<string, string>>;
  /** DbSet name inferred from the last LINQ query (e.g. Products from db.Products...). */
  resultEntity?: string;
  /** Trimmed editor snapshot from the last run on this tab. */
  lastRunExpression?: string;
  /** Current server-paged result page (0-based). */
  resultPageIndex?: number;
}

export interface EfvibeQueryFile {
  version: 1;
  name: string;
  connectionId: string;
  expression: string;
}

export const DEFAULT_QUERY_EXPRESSION = "";

export function createQueryTab(
  connectionId: string,
  options?: Partial<Pick<QueryTab, "name" | "expression" | "filePath">>,
): QueryTab {
  return {
    id: crypto.randomUUID(),
    kind: "query",
    name: options?.name ?? "Query 1",
    connectionId,
    expression: options?.expression ?? DEFAULT_QUERY_EXPRESSION,
    filePath: options?.filePath ?? "",
    activeResultsTab: "result",
  };
}

export function isSourceTab(
  tab: Pick<QueryTab, "kind" | "sourceFilePath">,
): tab is QueryTab & { kind: "source"; sourceFilePath: string; sourceLine: number } {
  return tab.kind === "source" && typeof tab.sourceFilePath === "string" && tab.sourceFilePath.length > 0;
}

export function createSourceTab(
  connectionId: string,
  sourceFilePath: string,
  sourceLine: number,
): QueryTab {
  return {
    id: crypto.randomUUID(),
    kind: "source",
    name: `${sourceFileLabel(sourceFilePath)}:${sourceLine}`,
    connectionId,
    expression: "",
    filePath: "",
    sourceFilePath,
    sourceLine,
    activeResultsTab: "result",
  };
}

export function restoreQueryTabFromSession(tab: QueryTab): QueryTab {
  return {
    ...tab,
    activeResultsTab: "result",
    lastPayload: undefined,
    lastRunExpression: undefined,
    resultRowsBaseline: undefined,
    resultEntity: undefined,
    resultPageIndex: undefined,
  };
}
