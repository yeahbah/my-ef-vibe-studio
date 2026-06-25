import { invoke } from "@tauri-apps/api/core";
import type { ConnectionSettings, PrerequisiteCheckResult } from "../types/connection";
import type { EvaluationJsonPayload } from "../types/evaluation";
import { parseEvaluationJson } from "../types/evaluation";

export interface ExpressionRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  payload?: EvaluationJsonPayload;
}

export async function invalidateEfvibeDaemon(): Promise<void> {
  await invoke("invalidate_efvibe_daemon");
}

export async function runExpressionViaDaemon(
  settings: ConnectionSettings,
  searchDirectory: string,
  cwd: string,
  expression: string,
  withPlan = false,
): Promise<ExpressionRunResult> {
  const line = await invoke<string>("daemon_eval", {
    settings,
    searchDirectory,
    cwd,
    expression,
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

export async function runDaemonJson(
  settings: ConnectionSettings,
  searchDirectory: string,
  cwd: string,
  request: Record<string, unknown>,
  timeoutMs?: number,
): Promise<string> {
  return invoke<string>("daemon_request", {
    settings,
    searchDirectory,
    cwd,
    request,
    timeoutMs,
  });
}

export async function checkPrerequisites(
  searchDirectory: string,
  toolPath: string,
  dotnetFramework: string,
): Promise<PrerequisiteCheckResult> {
  return invoke<PrerequisiteCheckResult>("check_prerequisites", {
    searchDirectory,
    toolPath,
    dotnetFramework,
  });
}

export async function openInIde(
  file: string,
  line: number,
  editor: string,
  customCommand: string,
): Promise<void> {
  await invoke("open_in_ide", {
    file,
    line,
    editor,
    customCommand,
  });
}
