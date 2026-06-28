import { describe, expect, it } from "vitest";
import { appendQueryExpression, resolveRunTextFromString, resolveStatementAtLine } from "./editorRunText";

describe("resolveStatementAtLine", () => {
  it("returns the current line for a single statement", () => {
    expect(resolveStatementAtLine(["db.Products.Take(1)"], 1)).toBe("db.Products.Take(1)");
  });

  it("groups multiline LINQ chains", () => {
    const lines = ["db.Products", "  .Where(p => p.ListPrice > 0)", "  .Take(10)"];
    expect(resolveStatementAtLine(lines, 2)).toBe(lines.join("\n"));
  });

  it("stops at SQL/LINQ boundaries", () => {
    const lines = ["SELECT 1", "db.Products.Take(1)"];
    expect(resolveStatementAtLine(lines, 1)).toBe("SELECT 1");
    expect(resolveStatementAtLine(lines, 2)).toBe("db.Products.Take(1)");
  });

  it("does not include commented-out statements", () => {
    const lines = ["// db.Products.Take(1)", "db.Orders.Take(1)"];
    expect(resolveStatementAtLine(lines, 2)).toBe("db.Orders.Take(1)");
  });

  it("does not run past a comment when expanding downward", () => {
    const lines = ["db.Products.Take(1)", "// db.Orders.Take(1)"];
    expect(resolveStatementAtLine(lines, 1)).toBe("db.Products.Take(1)");
  });
});

describe("resolveRunTextFromString", () => {
  it("returns the selected range when provided", () => {
    const value = "line one\nline two\nline three";
    expect(
      resolveRunTextFromString(value, {
        selectionStart: 9,
        selectionEnd: 17,
      }),
    ).toBe("line two");
  });

  it("returns the statement at the cursor line", () => {
    const value = "SELECT 1\n\nvar x = db.Products.Take(1)";
    expect(resolveRunTextFromString(value, { cursorLine: 3 })).toBe(
      "var x = db.Products.Take(1)",
    );
  });
});

describe("appendQueryExpression", () => {
  it("appends with a blank line separator", () => {
    expect(appendQueryExpression("db.Products.Take(1)", "db.Orders.Take(1)")).toBe(
      "db.Products.Take(1)\n\ndb.Orders.Take(1)",
    );
  });

  it("returns the addition when the editor is empty", () => {
    expect(appendQueryExpression("", "db.Products.Take(1)")).toBe("db.Products.Take(1)");
    expect(appendQueryExpression("   \n", "db.Products.Take(1)")).toBe("db.Products.Take(1)");
  });

  it("ignores empty additions", () => {
    expect(appendQueryExpression("db.Products.Take(1)", "   ")).toBe("db.Products.Take(1)");
  });
});
