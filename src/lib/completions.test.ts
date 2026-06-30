import { describe, expect, it } from "vitest";
import { completionReplaceRange, readDbPrefix } from "./completions";

describe("readDbPrefix", () => {
  it("matches db and dotted member prefixes", () => {
    expect(readDbPrefix("var x = db.")).toBe("db.");
    expect(readDbPrefix("await db.Products.Where")).toBe("db.Products.Where");
    expect(readDbPrefix("  db.Pro")).toBe("db.Pro");
  });

  it("ignores unrelated code", () => {
    expect(readDbPrefix("DbContext db;")).toBeUndefined();
    expect(readDbPrefix("var database = 1;")).toBeUndefined();
  });
});

describe("completionReplaceRange", () => {
  it("replaces the partial member after the last dot", () => {
    expect(completionReplaceRange("db.Pro", 1, 7)).toEqual({
      startLineNumber: 1,
      endLineNumber: 1,
      startColumn: 4,
      endColumn: 7,
    });
  });

  it("inserts at the cursor for db.", () => {
    expect(completionReplaceRange("db.", 1, 4)).toEqual({
      startLineNumber: 1,
      endLineNumber: 1,
      startColumn: 4,
      endColumn: 4,
    });
  });
});
