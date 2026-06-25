import { runExpressionViaDaemon } from "./daemonClient";
import type { ConnectionSettings } from "../types/connection";
import { looksLikeRawSql } from "./sqlDetect";

const TERMINAL_SUFFIXES = [
  ".ToListAsync()",
  ".ToArrayAsync()",
  ".CountAsync()",
  ".FirstOrDefaultAsync()",
  ".FirstAsync()",
  ".SingleOrDefaultAsync()",
  ".SingleAsync()",
  ".AnyAsync()",
  ".MaxAsync()",
  ".MinAsync()",
  ".AverageAsync()",
  ".SumAsync()",
  ".ToDictionaryAsync()",
  ".ToDictionary()",
  ".ToList()",
  ".ToArray()",
  ".Count()",
  ".FirstOrDefault()",
  ".First()",
  ".SingleOrDefault()",
  ".Single()",
  ".Any()",
  ".Max()",
  ".Min()",
  ".Average()",
  ".Sum()",
  ".AsEnumerable()",
];

export function buildSqlProbeExpression(expression: string): string | undefined {
  let trimmed = expression.trim().replace(/;+\s*$/u, "");
  if (!trimmed) {
    return undefined;
  }

  if (looksLikeRawSql(trimmed)) {
    return undefined;
  }

  if (/\.ToQueryString\(\)\s*$/iu.test(trimmed)) {
    return trimmed.endsWith(";") ? trimmed : `${trimmed};`;
  }

  for (const suffix of TERMINAL_SUFFIXES) {
    if (trimmed.endsWith(suffix)) {
      trimmed = trimmed.slice(0, -suffix.length);
      break;
    }
  }

  return `${trimmed}.ToQueryString();`;
}

export async function fetchLiveSqlPreview(
  settings: ConnectionSettings,
  searchDirectory: string,
  expression: string,
): Promise<{ sql?: string; error?: string }> {
  const trimmed = expression.trim();
  if (looksLikeRawSql(trimmed)) {
    return { sql: trimmed };
  }

  const probe = buildSqlProbeExpression(expression);
  if (!probe) {
    return {};
  }

  const result = await runExpressionViaDaemon(settings, searchDirectory, searchDirectory, probe, false);
  if (!result.payload) {
    return { error: result.stdout || "No SQL preview returned." };
  }

  if (!result.payload.success) {
    return { error: result.payload.error ?? "SQL preview failed." };
  }

  const sql =
    result.payload.translatedSql ??
    result.payload.sql[0] ??
    (typeof result.payload.value === "string" ? result.payload.value : undefined);

  return sql ? { sql } : { error: "No translated SQL available for this expression." };
}
