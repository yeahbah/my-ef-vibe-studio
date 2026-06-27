import { runExpressionViaDaemon } from "./daemonClient";
import { runSqlViaDaemon } from "./rawSql";
import { fetchDbInfoJson, fetchTablesJson } from "./schema";
import { looksLikeRawSql } from "./sqlDetect";
import type { ConnectionSettings } from "../types/connection";
import type { EvaluationJsonPayload } from "../types/evaluation";
import type { ResultsTab } from "../types/query";
import {
  formatDbInfoMarkdown,
  formatTablesMarkdown,
} from "./notebookMarkdown";

export interface NotebookEvaluationResult {
  payload: EvaluationJsonPayload;
  activeResultsTab: ResultsTab;
  markdownOutput?: boolean;
}

function errorPayload(message: string, sql: string[] = []): EvaluationJsonPayload {
  return {
    success: false,
    sql,
    metrics: { totalMs: 0, sqlCommandCount: 0, resultKind: "error" },
    warnings: [],
    error: message,
  };
}

async function evaluateCommandCell(
  source: string,
  settings: ConnectionSettings,
  searchDirectory: string,
  cwd: string,
): Promise<NotebookEvaluationResult> {
  const command = source.trim().toLowerCase();

  if (command === ":dbinfo") {
    const info = await fetchDbInfoJson(settings, searchDirectory, cwd);
    return {
      payload: {
        success: Boolean(info),
        value: formatDbInfoMarkdown(info),
        sql: [],
        metrics: { totalMs: 0, sqlCommandCount: 0, resultKind: "markdown" },
        warnings: [],
        error: info ? undefined : "Could not load `:dbinfo`.",
      },
      activeResultsTab: info ? "result" : "messages",
      markdownOutput: true,
    };
  }

  if (command === ":tables") {
    const tables = await fetchTablesJson(settings, searchDirectory, cwd);
    return {
      payload: {
        success: Boolean(tables?.tables?.length),
        value: formatTablesMarkdown(tables),
        sql: [],
        metrics: { totalMs: 0, sqlCommandCount: 0, resultKind: "markdown" },
        warnings: [],
        error: tables?.tables?.length ? undefined : "Could not load `:tables`.",
      },
      activeResultsTab: tables?.tables?.length ? "result" : "messages",
      markdownOutput: true,
    };
  }

  return {
    payload: errorPayload("Supported command cells: :dbinfo, :tables"),
    activeResultsTab: "messages",
  };
}

export async function evaluateNotebookSource(
  source: string,
  settings: ConnectionSettings,
  searchDirectory: string,
  cwd: string,
  withPlan: boolean,
): Promise<NotebookEvaluationResult> {
  const trimmed = source.trim();

  if (!trimmed) {
    return { payload: errorPayload("Cell is empty."), activeResultsTab: "result" };
  }

  if (!searchDirectory) {
    return {
      payload: errorPayload(
        "Set a search directory or EF project in the connection settings so efvibe can discover your .csproj.",
      ),
      activeResultsTab: "result",
    };
  }

  if (trimmed.startsWith(":")) {
    return evaluateCommandCell(trimmed, settings, searchDirectory, cwd);
  }

  if (looksLikeRawSql(trimmed)) {
    const result = await runSqlViaDaemon(settings, searchDirectory, cwd, trimmed, withPlan);
    const payload =
      result.payload ??
      errorPayload(result.stdout || "No SQL result payload returned.", [trimmed]);

    return {
      payload,
      activeResultsTab: withPlan ? "plan" : payload.success ? "result" : "messages",
    };
  }

  const expression = trimmed;
  const result = await runExpressionViaDaemon(settings, searchDirectory, cwd, expression, withPlan);
  const payload =
    result.payload ?? errorPayload(result.stdout || "No evaluation payload returned.");

  return {
    payload,
    activeResultsTab: withPlan ? "plan" : payload.success ? "result" : "messages",
  };
}
