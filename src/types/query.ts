import type { EvaluationJsonPayload } from "./evaluation";

export type ResultsTab = "result" | "sql" | "plan" | "messages";

export type LegacyResultsTab = ResultsTab | "explorer";

export function normalizeResultsTab(tab: LegacyResultsTab | undefined): ResultsTab {
  if (!tab || tab === "explorer") {
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
