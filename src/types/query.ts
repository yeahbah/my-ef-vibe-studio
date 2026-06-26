import type { EvaluationJsonPayload } from "./evaluation";

export type ResultsTab = "result" | "plan" | "messages";

export type LegacyResultsTab = ResultsTab | "explorer" | "sql";

export function normalizeResultsTab(tab: LegacyResultsTab | undefined): ResultsTab {
  if (!tab || tab === "explorer" || tab === "sql") {
    return "result";
  }

  return tab;
}

export interface QueryTab {
  id: string;
  name: string;
  connectionId: string;
  expression: string;
  filePath: string;
  favorite?: boolean;
  folderId?: string;
  activeResultsTab: ResultsTab;
  lastPayload?: EvaluationJsonPayload;
  /** Snapshot of result rows after the last successful query run (for grid save diffs). */
  resultRowsBaseline?: Array<Record<string, string>>;
  /** DbSet name inferred from the last LINQ query (e.g. Products from db.Products...). */
  resultEntity?: string;
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
    name: options?.name ?? "Query 1",
    connectionId,
    expression: options?.expression ?? DEFAULT_QUERY_EXPRESSION,
    filePath: options?.filePath ?? "",
    activeResultsTab: "result",
  };
}
