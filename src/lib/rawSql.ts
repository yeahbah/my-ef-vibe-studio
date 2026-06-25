import { runDaemonJson, type ExpressionRunResult } from "./daemonClient";
import type { ConnectionSettings } from "../types/connection";
import { parseEvaluationJson } from "../types/evaluation";

export async function runSqlViaDaemon(
  settings: ConnectionSettings,
  searchDirectory: string,
  cwd: string,
  sql: string,
  withPlan = false,
): Promise<ExpressionRunResult> {
  const line = await runDaemonJson(settings, searchDirectory, cwd, {
    type: "executeSql",
    sql,
    withPlan,
  });

  const payload = parseEvaluationJson(line);

  return {
    exitCode: payload?.success ? 0 : 20,
    stdout: line,
    stderr: "",
    payload,
  };
}
