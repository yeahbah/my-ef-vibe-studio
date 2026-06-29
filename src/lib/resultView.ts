import { emptyEvaluationPayload, type EvaluationJsonPayload } from "../types/evaluation";
import type { QueryTab } from "../types/query";
import { hasConsoleOutput } from "./consoleOutput";

export type ResultViewKind = "pending" | "compare" | "benchmark" | "grid" | "scalar" | "console" | "error" | "empty";

export function resolveResultView(payload: EvaluationJsonPayload): ResultViewKind {
  if (payload.metrics.resultKind === "pending") {
    return "pending";
  }

  if ((payload.compareResults?.length ?? 0) >= 2) {
    return "compare";
  }

  if (payload.benchmarkResult && payload.benchmarkResult.samples.length > 0) {
    return "benchmark";
  }

  if (!payload.success) {
    return "error";
  }

  if (payload.rows && payload.rows.length > 0) {
    return "grid";
  }

  if (hasConsoleOutput(payload.consoleOutput) && !payload.value?.trim()) {
    return "console";
  }

  if (payload.value !== undefined && payload.value !== null && payload.value !== "") {
    return "scalar";
  }

  if (hasConsoleOutput(payload.consoleOutput)) {
    return "console";
  }

  return "empty";
}

export function resolveDisplayPayload(
  tab: Pick<QueryTab, "lastPayload"> | undefined,
): EvaluationJsonPayload {
  if (!tab?.lastPayload || tab.lastPayload.metrics.resultKind === "pending") {
    return emptyEvaluationPayload();
  }

  return tab.lastPayload;
}
