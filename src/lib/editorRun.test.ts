import { describe, expect, it } from "vitest";
import { normalizeExpression } from "./editorRun";

describe("normalizeExpression", () => {
  it("adds semicolon to statement forms", () => {
    expect(normalizeExpression("using System", false)).toBe("using System;");
    expect(normalizeExpression("var x = db.Products.Count()", false)).toBe(
      "var x = db.Products.Count();",
    );
  });

  it("preserves existing statement terminators", () => {
    expect(normalizeExpression("using System;", false)).toBe("using System;");
  });

  it("adds semicolon to expressions in normal mode", () => {
    expect(normalizeExpression("db.Products.Count()", false)).toBe("db.Products.Count();");
  });

  it("strips trailing semicolons in lambda mode", () => {
    expect(normalizeExpression("x => x.Id;", true)).toBe("x => x.Id");
  });

  it("returns empty input unchanged", () => {
    expect(normalizeExpression("   ", false)).toBe("");
  });
});
