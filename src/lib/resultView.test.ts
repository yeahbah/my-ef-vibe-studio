import { describe, expect, it } from "vitest";
import { emptyEvaluationPayload, type EvaluationJsonPayload } from "../types/evaluation";
import { resolveDisplayPayload, resolveResultView } from "./resultView";

function samplePayload(overrides: Partial<EvaluationJsonPayload> = {}): EvaluationJsonPayload {
  return {
    success: true,
    sql: [],
    metrics: { totalMs: 12, sqlCommandCount: 1, resultKind: "Enumerable" },
    warnings: [],
    rows: [{ ProductId: "1", Name: "A" }],
    ...overrides,
  };
}

describe("resolveResultView", () => {
  it("returns pending for the empty payload", () => {
    expect(resolveResultView(emptyEvaluationPayload())).toBe("pending");
  });

  it("returns compare when compare results are present", () => {
    expect(
      resolveResultView(
        samplePayload({
          rows: undefined,
          compareResults: [
            {
              index: 1,
              label: "A",
              success: true,
              metrics: { totalMs: 1, sqlCommandCount: 1, resultKind: "Enumerable" },
            },
            {
              index: 2,
              label: "B",
              success: true,
              metrics: { totalMs: 2, sqlCommandCount: 1, resultKind: "Enumerable" },
            },
          ],
        }),
      ),
    ).toBe("compare");
  });

  it("returns grid for row results", () => {
    expect(resolveResultView(samplePayload())).toBe("grid");
  });

  it("returns scalar for scalar results", () => {
    expect(
      resolveResultView(
        samplePayload({
          rows: undefined,
          value: "42",
        }),
      ),
    ).toBe("scalar");
  });

  it("returns console for program output without rows or value", () => {
    expect(
      resolveResultView(
        samplePayload({
          rows: undefined,
          consoleOutput: "Catalog Spotlight\n========",
        }),
      ),
    ).toBe("console");
  });

  it("returns benchmark when benchmark results are present", () => {
    expect(
      resolveResultView({
        success: true,
        sql: [],
        metrics: { totalMs: 12, sqlCommandCount: 1, resultKind: "Enumerable" },
        warnings: [],
        benchmarkResult: {
          iterations: 3,
          minMs: 10,
          averageMs: 12,
          maxMs: 15,
          p95Ms: 15,
          samples: [
            {
              iteration: 1,
              totalMs: 10,
              sqlCommandCount: 1,
              success: true,
            },
          ],
        },
      }),
    ).toBe("benchmark");
  });
});

describe("resolveDisplayPayload", () => {
  it("keeps the last run results after the editor changes", () => {
    const lastPayload = samplePayload();

    const payload = resolveDisplayPayload({
      lastPayload,
    });

    expect(payload).toBe(lastPayload);
    expect(resolveResultView(payload)).toBe("grid");
  });

  it("shows compare results from the last run", () => {
    const lastPayload = samplePayload({
      rows: undefined,
      compareResults: [
        {
          index: 1,
          label: "A",
          success: true,
          metrics: { totalMs: 1, sqlCommandCount: 1, resultKind: "Enumerable" },
        },
        {
          index: 2,
          label: "B",
          success: true,
          metrics: { totalMs: 2, sqlCommandCount: 1, resultKind: "Enumerable" },
        },
      ],
    });

    const payload = resolveDisplayPayload({ lastPayload });

    expect(resolveResultView(payload)).toBe("compare");
  });
});
