import { describe, expect, it } from "vitest";
import { restoreQueryTabFromSession, type QueryTab } from "../types/query";

function tab(overrides: Partial<QueryTab> = {}): QueryTab {
  return {
    id: "tab-1",
    name: "Query 1",
    expression: "db.Products.ToList();",
    connectionId: "conn",
    filePath: "",
    activeResultsTab: "plan",
    lastRunExpression: "db.Products.ToList();",
    lastPayload: {
      success: true,
      sql: [],
      metrics: { totalMs: 12, sqlCommandCount: 1, resultKind: "Enumerable" },
      warnings: [],
      rows: [{ ProductId: "1" }],
    },
    resultRowsBaseline: [{ ProductId: "1" }],
    resultEntity: "Products",
    ...overrides,
  };
}

describe("restoreQueryTabFromSession", () => {
  it("clears persisted run results while keeping editor state", () => {
    const restored = restoreQueryTabFromSession(tab());

    expect(restored.expression).toBe("db.Products.ToList();");
    expect(restored.activeResultsTab).toBe("result");
    expect(restored.lastPayload).toBeUndefined();
    expect(restored.lastRunExpression).toBeUndefined();
    expect(restored.resultRowsBaseline).toBeUndefined();
    expect(restored.resultEntity).toBeUndefined();
  });
});
