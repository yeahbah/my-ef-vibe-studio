import { describe, expect, it } from "vitest";
import { shouldRenderStructuredScalar } from "./consoleOutput";
import { resolveResultView } from "./resultView";

describe("shouldRenderStructuredScalar", () => {
  it("treats multiline text as plain output", () => {
    expect(shouldRenderStructuredScalar("line one\nline two")).toBe(false);
  });

  it("keeps structured object text in tree mode", () => {
    expect(shouldRenderStructuredScalar('Product { ProductId = 1, Name = "A" }')).toBe(true);
  });
});

describe("resolveResultView console output", () => {
  it("returns console when only program output is present", () => {
    expect(
      resolveResultView({
        success: true,
        consoleOutput: "hello\nworld",
        sql: [],
        metrics: { totalMs: 1, sqlCommandCount: 0, resultKind: "Null" },
        warnings: [],
      }),
    ).toBe("console");
  });

  it("returns scalar when console output and return value are both present", () => {
    expect(
      resolveResultView({
        success: true,
        consoleOutput: "hello",
        value: "8 rows",
        sql: [],
        metrics: { totalMs: 1, sqlCommandCount: 1, resultKind: "Enumerable" },
        warnings: [],
      }),
    ).toBe("scalar");
  });
});
