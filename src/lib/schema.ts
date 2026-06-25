import { runDaemonJson } from "./daemonClient";
import type { ConnectionSettings } from "../types/connection";
import type {
  DbInfoJsonPayload,
  DescribeJsonPayload,
  TablesJsonPayload,
} from "../types/schema";
import type { ScanCiOutputDocument, ScanMode } from "../types/scan";

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

export async function fetchTablesJson(
  settings: ConnectionSettings,
  searchDirectory: string,
  cwd: string,
): Promise<TablesJsonPayload | undefined> {
  const line = await runDaemonJson(settings, searchDirectory, cwd, { type: "tables" });
  return parseJsonLine<TablesJsonPayload>(line);
}

export async function fetchDescribeJson(
  settings: ConnectionSettings,
  searchDirectory: string,
  cwd: string,
  entityName: string,
): Promise<DescribeJsonPayload | undefined> {
  const line = await runDaemonJson(settings, searchDirectory, cwd, {
    type: "describe",
    entity: entityName,
  });
  return parseJsonLine<DescribeJsonPayload>(line);
}

export async function fetchDbInfoJson(
  settings: ConnectionSettings,
  searchDirectory: string,
  cwd: string,
): Promise<DbInfoJsonPayload | undefined> {
  const line = await runDaemonJson(settings, searchDirectory, cwd, { type: "dbinfo" });
  return parseJsonLine<DbInfoJsonPayload>(line);
}

export async function runScanJson(
  settings: ConnectionSettings,
  searchDirectory: string,
  cwd: string,
  mode: ScanMode,
): Promise<ScanCiOutputDocument | undefined> {
  const line = await runDaemonJson(
    settings,
    searchDirectory,
    cwd,
    {
      type: "scan",
      mode,
      respectDismissals: true,
    },
    20 * 60_000,
  );
  return parseJsonLine<ScanCiOutputDocument>(line);
}

export function buildDbSetCountExpression(dbSetName: string): string {
  return `db.${dbSetName}.Count()`;
}

export function buildDbSetSampleExpression(dbSetName: string, take = 10): string {
  return `db.${dbSetName}.Take(${take}).ToList()`;
}
