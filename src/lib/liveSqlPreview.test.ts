import { describe, expect, it } from "vitest";
import { buildAutoPreviewKey } from "./liveSql";
import type { ConnectionSettings } from "../types/connection";

const settings: ConnectionSettings = {
  workspaceRoot: "/workspace",
  project: "/workspace/App.csproj",
  startupProject: "",
  context: "AppDbContext",
  connectionString: "",
  toolPath: "/usr/local/bin/efvibe",
  dbLog: true,
  dotnetFramework: "",
};

describe("buildAutoPreviewKey", () => {
  it("changes when editor text changes", () => {
    const base = buildAutoPreviewKey("db.Products.Take(10)", false, settings, "/workspace");
    const edited = buildAutoPreviewKey("db.Products.Take(20)", false, settings, "/workspace");

    expect(base).not.toBe(edited);
  });

  it("changes when SQL vs LINQ mode changes", () => {
    const linq = buildAutoPreviewKey("SELECT 1", false, settings, "/workspace");
    const sql = buildAutoPreviewKey("SELECT 1", true, settings, "/workspace");

    expect(linq).not.toBe(sql);
  });

  it("is stable for equivalent connection inputs", () => {
    const first = buildAutoPreviewKey("db.Products", false, { ...settings }, "/workspace");
    const second = buildAutoPreviewKey("db.Products", false, { ...settings }, "/workspace");

    expect(first).toBe(second);
  });
});
