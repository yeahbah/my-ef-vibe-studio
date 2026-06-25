export interface EvaluationJsonMetrics {
  totalMs: number;
  databaseMs?: number;
  rowCount?: number;
  sqlCommandCount: number;
  resultKind: string;
  estimatedBytes?: number;
}

export interface EvaluationJsonPayload {
  success: boolean;
  value?: string | null;
  rows?: Array<Record<string, string>>;
  sql: string[];
  translatedSql?: string;
  queryPlan?: string;
  queryPlanNote?: string;
  metrics: EvaluationJsonMetrics;
  warnings: string[];
  error?: string;
  snippet?: string;
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
  message = "Write LINQ or SQL in the editor. Run the current statement with Ctrl+Enter (selection runs exactly what you highlight). Results, SQL, and query plans appear here.",
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
