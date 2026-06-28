import { describe, expect, it } from "vitest";
import {
  isQueryLanguageBoundary,
  looksLikeRawSql,
  resolveQueryEditorLanguage,
  stripLeadingSqlComments,
} from "./sqlDetect";

describe("looksLikeRawSql", () => {
  it("detects SELECT statements", () => {
    expect(looksLikeRawSql("SELECT * FROM Products")).toBe(true);
  });

  it("detects SQL after leading comments", () => {
    expect(looksLikeRawSql("-- setup\nSELECT 1")).toBe(true);
  });

  it("rejects LINQ expressions", () => {
    expect(looksLikeRawSql("db.Products.Take(10)")).toBe(false);
    expect(looksLikeRawSql("var x = db.Users.Count();")).toBe(false);
  });

  it("uses the first meaningful line to classify mixed snippets", () => {
    expect(looksLikeRawSql("SELECT 1\n.Where(x => x.Id > 0)")).toBe(true);
    expect(looksLikeRawSql(".Where(x => x.Id > 0)\nSELECT 1")).toBe(false);
  });

  it("detects SQL after T-SQL DECLARE parameter lines", () => {
    const sql = `DECLARE @p int = 25;

SELECT TOP(@p) [p].[ProductId], [p].[Name]
FROM [Production].[Product] AS [p]
WHERE [p].[DiscontinuedDate] IS NULL
ORDER BY [p].[Name]`;

    expect(looksLikeRawSql(sql)).toBe(true);
    expect(resolveQueryEditorLanguage(sql)).toBe("sql");
  });

  it("detects SQL after SET preamble lines", () => {
    expect(looksLikeRawSql("SET NOCOUNT ON;\nSELECT 1")).toBe(true);
    expect(looksLikeRawSql("SET @p = 25;\nSELECT @p")).toBe(true);
    expect(looksLikeRawSql("DECLARE @p int = 25; SELECT TOP(@p) 1")).toBe(true);
  });
});

describe("stripLeadingSqlComments", () => {
  it("removes line comments", () => {
    expect(stripLeadingSqlComments("-- note\nSELECT 1")).toBe("SELECT 1");
  });

  it("removes block comments", () => {
    expect(stripLeadingSqlComments("/* note */ SELECT 1")).toBe("SELECT 1");
  });
});

describe("resolveQueryEditorLanguage", () => {
  it("returns sql for raw SQL", () => {
    expect(resolveQueryEditorLanguage("SELECT 1")).toBe("sql");
  });

  it("returns csharp for LINQ", () => {
    expect(resolveQueryEditorLanguage("db.Products.Take(1)")).toBe("csharp");
  });
});

describe("isQueryLanguageBoundary", () => {
  it("detects SQL to LINQ boundaries", () => {
    expect(isQueryLanguageBoundary("SELECT 1", "db.Products.Take(1)")).toBe(true);
  });

  it("detects LINQ to SQL boundaries", () => {
    expect(isQueryLanguageBoundary("db.Products.Take(1)", "SELECT 1")).toBe(true);
  });

  it("returns false for same-language neighbors", () => {
    expect(isQueryLanguageBoundary("SELECT 1", "SELECT 2")).toBe(false);
    expect(isQueryLanguageBoundary("db.A", "db.B")).toBe(false);
  });
});
