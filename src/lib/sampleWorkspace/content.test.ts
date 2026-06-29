import { describe, expect, it } from "vitest";
import {
  SAMPLE_CONNECTION_ID,
  SAMPLE_QUERIES,
  SAMPLE_SCRIPT_FILES,
  buildSampleWorkspaceJson,
} from "./content";
import { getSampleParentDirectory } from "./index";

describe("sample workspace content", () => {
  it("includes scripts, queries, and script session settings", () => {
    const workspace = JSON.parse(buildSampleWorkspaceJson(SAMPLE_CONNECTION_ID)) as {
      connections: Array<{
        scriptSearchPath?: string;
        scriptLoads?: string[];
        scriptUsings?: string[];
      }>;
    };

    expect(SAMPLE_SCRIPT_FILES.map((file) => file.fileName)).toEqual([
      "constants.csx",
      "helpers.csx",
      "product-filters.csx",
    ]);
    expect(SAMPLE_QUERIES.length).toBeGreaterThanOrEqual(7);
    expect(SAMPLE_QUERIES.some((query) => query.fileName === "07-csharp-program.efvibe-query")).toBe(
      true,
    );
    expect(workspace.connections[0]?.scriptSearchPath).toBe("scripts");
    expect(workspace.connections[0]?.scriptLoads).toEqual([
      "constants.csx",
      "product-filters.csx",
      "helpers.csx",
    ]);
    expect(workspace.connections[0]?.scriptUsings).toContain(
      "AdventureWorks.Domain.Entities.Production",
    );
  });

  it("resolves the sample parent directory under the workspace root", () => {
    expect(getSampleParentDirectory("/home/user/.efvibe")).toBe("/home/user/.efvibe/samples");
  });
});
