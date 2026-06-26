import { runDaemonJson } from "./daemonClient";
import { fetchDescribeJson } from "./schema";
import type { ConnectionSettings } from "../types/connection";
import { parseEvaluationJson } from "../types/evaluation";

export interface ResultRowChange {
  keys: Record<string, string>;
  values?: Record<string, string>;
}

export interface ResultChangeSet {
  updates: ResultRowChange[];
  deletes: ResultRowChange[];
}

const DB_SET_PATTERN = /\bdb\.(\w+)/u;

export function inferResultEntity(expression: string): string | undefined {
  const match = expression.trim().match(DB_SET_PATTERN);
  return match?.[1];
}

function findColumnValue(row: Record<string, string>, column: string): string {
  if (Object.prototype.hasOwnProperty.call(row, column)) {
    return row[column];
  }

  const key = Object.keys(row).find((entry) => entry.toLowerCase() === column.toLowerCase());
  return key ? row[key] : "";
}

function rowKey(row: Record<string, string>, primaryKeys: string[]): string {
  return primaryKeys.map((column) => findColumnValue(row, column)).join("\0");
}

function extractKeys(
  row: Record<string, string>,
  primaryKeys: string[],
): Record<string, string> {
  const keys: Record<string, string> = {};

  for (const column of primaryKeys) {
    keys[column] = findColumnValue(row, column);
  }

  return keys;
}

export function getPrimaryKeyColumns(members: Array<{ name: string; notes?: string }>): string[] {
  return members
    .filter((member) => member.notes?.includes("PK"))
    .map((member) => member.name);
}

export function buildResultChangeSet(
  baseline: Array<Record<string, string>>,
  draft: Array<Record<string, string>>,
  primaryKeys: string[],
): ResultChangeSet {
  if (primaryKeys.length === 0) {
    return { updates: [], deletes: [] };
  }

  const primaryKeyNames = new Set(primaryKeys.map((column) => column.toLowerCase()));
  const draftByKey = new Map(
    draft.map((row) => [rowKey(row, primaryKeys), row] as const),
  );
  const baselineByKey = new Map(
    baseline.map((row) => [rowKey(row, primaryKeys), row] as const),
  );

  const deletes = [...baselineByKey.entries()]
    .filter(([key]) => !draftByKey.has(key))
    .map(([, row]) => ({ keys: extractKeys(row, primaryKeys) }));

  const updates = [...draftByKey.entries()]
    .flatMap(([key, draftRow]) => {
      const baselineRow = baselineByKey.get(key);
      if (!baselineRow) {
        return [];
      }

      const values: Record<string, string> = {};
      const columns = new Set([...Object.keys(draftRow), ...Object.keys(baselineRow)]);

      for (const column of columns) {
        if (primaryKeyNames.has(column.toLowerCase())) {
          continue;
        }

        const draftValue = findColumnValue(draftRow, column);
        const baselineValue = findColumnValue(baselineRow, column);

        if (draftValue !== baselineValue) {
          values[column] = draftValue;
        }
      }

      if (Object.keys(values).length === 0) {
        return [];
      }

      return [{ keys: extractKeys(draftRow, primaryKeys), values }];
    });

  return { updates, deletes };
}

export async function persistResultChanges(
  settings: ConnectionSettings,
  searchDirectory: string,
  cwd: string,
  entity: string,
  baseline: Array<Record<string, string>>,
  draft: Array<Record<string, string>>,
): Promise<string> {
  const describe = await fetchDescribeJson(settings, searchDirectory, cwd, entity);

  if (!describe?.success) {
    throw new Error(
      describe?.error ?? `Could not describe entity "${entity}" for result persistence.`,
    );
  }

  const primaryKeys = getPrimaryKeyColumns(describe.members ?? []);
  if (primaryKeys.length === 0) {
    throw new Error(`Entity "${entity}" does not expose a primary key for result persistence.`);
  }

  const missingPrimaryKeyColumn = primaryKeys.find(
    (column) => !draft.some((row) => findColumnValue(row, column) !== ""),
  );

  if (missingPrimaryKeyColumn) {
    throw new Error(
      `Result rows are missing primary key column "${missingPrimaryKeyColumn}". Run a DbSet query that includes primary keys before editing.`,
    );
  }

  const changes = buildResultChangeSet(baseline, draft, primaryKeys);
  if (changes.updates.length === 0 && changes.deletes.length === 0) {
    return "No database changes to save.";
  }

  const resolvedEntity = describe.dbSet ?? entity;
  const line = await runDaemonJson(settings, searchDirectory, cwd, {
    type: "applyResultChanges",
    entity: resolvedEntity,
    updates: changes.updates,
    deletes: changes.deletes,
  });

  const payload = parseEvaluationJson(line);
  if (!payload?.success) {
    let message = payload?.error ?? "Failed to persist result changes.";
    if (/unknown request type/i.test(message) && /applyresultchanges/i.test(message)) {
      message =
        "Saving grid edits requires a recent efvibe build with applyResultChanges support. Update the tool in Settings or rebuild the engine.";
    }

    throw new Error(message);
  }

  return payload.value?.trim() || "Saved changes to the database.";
}
