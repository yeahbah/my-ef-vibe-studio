import type { EvaluationJsonPayload } from "../types/evaluation";

export interface EvaluationHistoryEntry {
  id: string;
  expression: string;
  totalMs: number;
  databaseMs?: number;
  rowCount?: number;
  sqlCommandCount: number;
  resultKind: string;
  timestamp: string;
  connectionName: string;
}

export interface HistoryDateGroup {
  dateKey: string;
  label: string;
  entries: EvaluationHistoryEntry[];
}

export const HISTORY_VISIBLE_DAYS = 7;

const MAX_ENTRIES = 50;

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function filterRecentHistory(
  history: EvaluationHistoryEntry[],
  now = new Date(),
): EvaluationHistoryEntry[] {
  const oldestVisibleDay = startOfLocalDay(now);
  oldestVisibleDay.setDate(oldestVisibleDay.getDate() - (HISTORY_VISIBLE_DAYS - 1));

  return history.filter((entry) => new Date(entry.timestamp) >= oldestVisibleDay);
}

export function formatHistoryDateLabel(dateKey: string, now = new Date()): string {
  const todayKey = localDateKey(now);
  const yesterday = startOfLocalDay(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = localDateKey(yesterday);

  if (dateKey === todayKey) {
    return "Today";
  }

  if (dateKey === yesterdayKey) {
    return "Yesterday";
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" as const } : {}),
  }).format(date);
}

export function groupHistoryByDate(
  history: EvaluationHistoryEntry[],
  now = new Date(),
): HistoryDateGroup[] {
  const groups = new Map<string, EvaluationHistoryEntry[]>();

  for (const entry of filterRecentHistory(history, now)) {
    const dateKey = localDateKey(new Date(entry.timestamp));
    const bucket = groups.get(dateKey) ?? [];
    bucket.push(entry);
    groups.set(dateKey, bucket);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([dateKey, entries]) => ({
      dateKey,
      label: formatHistoryDateLabel(dateKey, now),
      entries,
    }));
}

export function recordHistoryEntry(
  history: EvaluationHistoryEntry[],
  expression: string,
  payload: EvaluationJsonPayload,
  connectionName: string,
): EvaluationHistoryEntry[] {
  const entry: EvaluationHistoryEntry = {
    id: crypto.randomUUID(),
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
