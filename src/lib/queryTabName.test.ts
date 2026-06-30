import { describe, expect, it } from "vitest";
import { normalizeQueryTabName } from "./queryTabName";

describe("normalizeQueryTabName", () => {
  it("trims whitespace", () => {
    expect(normalizeQueryTabName("  Catalog radar  ")).toBe("Catalog radar");
  });

  it("uses fallback when empty", () => {
    expect(normalizeQueryTabName("   ", "Query 2")).toBe("Query 2");
  });

  it("truncates very long names", () => {
    const longName = "x".repeat(200);
    expect(normalizeQueryTabName(longName).length).toBe(120);
  });
});
