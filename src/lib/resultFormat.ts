import type { EvaluationJsonPayload } from "../types/evaluation";

export type ExportFormat = "csv" | "json";

export function canExportPayload(payload: EvaluationJsonPayload): boolean {
  if (!payload.success) {
    return false;
  }

  if (payload.rows && payload.rows.length > 0) {
    return true;
  }

  return payload.value !== undefined && payload.value !== null;
}

export function buildExportContent(
  payload: EvaluationJsonPayload,
  format: ExportFormat,
): string | undefined {
  if (!canExportPayload(payload)) {
    return undefined;
  }

  const rows =
    payload.rows && payload.rows.length > 0
      ? payload.rows
      : [{ value: String(payload.value ?? "") }];

  return format === "json" ? buildJson(rows) : buildCsv(rows);
}

function buildCsv(rows: Array<Record<string, string>>): string {
  const columns = collectColumns(rows);
  const lines = [
    columns.map(escapeCsv).join(","),
    ...rows.map((row) => columns.map((column) => escapeCsv(row[column] ?? "")).join(",")),
  ];

  return `${lines.join("\n")}\n`;
}

function buildJson(rows: Array<Record<string, string>>): string {
  return `${JSON.stringify(rows, null, 2)}\n`;
}

function collectColumns(rows: Array<Record<string, string>>): string[] {
  const columns = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      columns.add(key);
    }
  }

  return [...columns];
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export function formatMetrics(payload: EvaluationJsonPayload): string {
  const metrics = [
    `${payload.metrics.totalMs} ms`,
    payload.metrics.databaseMs !== undefined ? `db ${payload.metrics.databaseMs} ms` : undefined,
    payload.metrics.rowCount !== undefined ? `${payload.metrics.rowCount} row(s)` : undefined,
    payload.metrics.sqlCommandCount > 0
      ? `${payload.metrics.sqlCommandCount} command(s)`
      : undefined,
    payload.metrics.resultKind ? payload.metrics.resultKind : undefined,
  ].filter((entry): entry is string => Boolean(entry));

  return metrics.join(" · ");
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
