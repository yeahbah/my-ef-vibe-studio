import { runExpressionViaDaemon } from "./daemonClient";
import type { ConnectionSettings } from "../types/connection";
import type { EvaluationJsonPayload } from "../types/evaluation";

export interface BenchmarkSample {
  iteration: number;
  totalMs: number;
  databaseMs?: number;
}

export interface BenchmarkResult {
  iterations: number;
  samples: BenchmarkSample[];
  averageMs: number;
  minMs: number;
  maxMs: number;
}

export async function runBenchmark(
  settings: ConnectionSettings,
  searchDirectory: string,
  expression: string,
  iterations = 5,
): Promise<BenchmarkResult> {
  const samples: BenchmarkSample[] = [];

  for (let iteration = 1; iteration <= iterations; iteration += 1) {
    const result = await runExpressionViaDaemon(
      settings,
      searchDirectory,
      searchDirectory,
      expression,
      false,
    );

    const payload = result.payload as EvaluationJsonPayload | undefined;
    if (!payload?.success) {
      throw new Error(payload?.error ?? `Benchmark iteration ${iteration} failed.`);
    }

    samples.push({
      iteration,
      totalMs: payload.metrics.totalMs,
      databaseMs: payload.metrics.databaseMs,
    });
  }

  const totals = samples.map((sample) => sample.totalMs);
  const averageMs = Math.round(totals.reduce((sum, value) => sum + value, 0) / totals.length);
  return {
    iterations,
    samples,
    averageMs,
    minMs: Math.min(...totals),
    maxMs: Math.max(...totals),
  };
}
