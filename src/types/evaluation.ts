export interface EvaluationJsonMetrics {
  totalMs: number;
  databaseMs?: number;
  rowCount?: number;
  sqlCommandCount: number;
  resultKind: string;
  estimatedBytes?: number;
}

export interface EvaluationJsonCompareEntry {
  index: number;
  label: string;
  snippet?: string;
  success: boolean;
  error?: string;
  metrics: EvaluationJsonMetrics;
}

export interface EvaluationJsonBenchmarkSample {
  iteration: number;
  totalMs: number;
  databaseMs?: number;
  rowCount?: number;
  sqlCommandCount: number;
  success: boolean;
  error?: string;
}

export interface EvaluationJsonBenchmarkResult {
  iterations: number;
  samples: EvaluationJsonBenchmarkSample[];
  minMs: number;
  averageMs: number;
  maxMs: number;
  p95Ms: number;
  snippet?: string;
}

export interface EvaluationJsonPayload {
  success: boolean;
  value?: string | null;
  consoleOutput?: string | null;
  rows?: Array<Record<string, string>>;
  sql: string[];
  translatedSql?: string;
  queryPlan?: string;
  queryPlanNote?: string;
  metrics: EvaluationJsonMetrics;
  warnings: string[];
  error?: string;
  snippet?: string;
  compareResults?: EvaluationJsonCompareEntry[];
  benchmarkResult?: EvaluationJsonBenchmarkResult;
  pageIndex?: number;
  pageSize?: number;
  hasMore?: boolean;
  pagingSupported?: boolean;
}

export const DEFAULT_RESULT_PAGE_SIZE = 100;

export interface ResultPagingRequest {
  skip: number;
  pageSize: number;
}

export function parseEvaluationJson(stdout: string): EvaluationJsonPayload | undefined {
  const line = stdout
    .split(/\r?\n/u)
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("{"));

  if (!line) {
    return undefined;
  }

  try {
    return JSON.parse(line) as EvaluationJsonPayload;
  } catch {
    return undefined;
  }
}

export function emptyEvaluationPayload(
  message = "Write LINQ or SQL in the editor. Run the current statement with Ctrl+Enter (selection runs exactly what you highlight). Results and query plans appear here.",
): EvaluationJsonPayload {
  return {
    success: true,
    value: message,
    sql: [],
    metrics: {
      totalMs: 0,
      sqlCommandCount: 0,
      resultKind: "pending",
    },
    warnings: [],
  };
}
