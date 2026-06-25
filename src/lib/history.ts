import type { EvaluationJsonPayload } from "../types/evaluation";

export interface EvaluationHistoryEntry {
  expression: string;
  totalMs: number;
  databaseMs?: number;
  rowCount?: number;
  sqlCommandCount: number;
  resultKind: string;
  timestamp: string;
  connectionName: string;
}

const MAX_ENTRIES = 50;

export function recordHistoryEntry(
  history: EvaluationHistoryEntry[],
  expression: string,
  payload: EvaluationJsonPayload,
  connectionName: string,
): EvaluationHistoryEntry[] {
  const entry: EvaluationHistoryEntry = {
    expression,
    totalMs: payload.metrics.totalMs,
    databaseMs: payload.metrics.databaseMs,
    rowCount: payload.metrics.rowCount,
    sqlCommandCount: payload.metrics.sqlCommandCount,
    resultKind: payload.metrics.resultKind,
    timestamp: new Date().toISOString(),
    connectionName,
  };

  return [entry, ...history].slice(0, MAX_ENTRIES);
}
