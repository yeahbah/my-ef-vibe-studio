import { runDaemonJson } from "./daemonClient";
import type { ConnectionSettings } from "../types/connection";
import type { SqlToLinqResult } from "../types/sqlToLinq";

function parseJsonLine<T>(stdout: string): T | undefined {
  const line = stdout
    .split(/\r?\n/u)
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("{"));

  if (!line) {
    return undefined;
  }

  try {
    return JSON.parse(line) as T;
  } catch {
    return undefined;
  }
}

export async function fetchSqlToLinq(
  settings: ConnectionSettings,
  searchDirectory: string,
  cwd: string,
  sql: string,
): Promise<SqlToLinqResult | undefined> {
  const line = await runDaemonJson(settings, searchDirectory, cwd, {
    type: "sqlToLinq",
    sql,
  });

  return parseJsonLine<SqlToLinqResult>(line);
}
