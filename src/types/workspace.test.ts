import { describe, expect, it } from "vitest";
import {
  connectionDisplayName,
  createSampleConnection,
  duplicateConnection,
  resolveScriptSearchPath,
  resolveSearchDirectory,
  workspaceConnectionToSettings,
} from "./workspace";

describe("connectionDisplayName", () => {
  it("prefers the connection name", () => {
    expect(
      connectionDisplayName({
        ...createSampleConnection("AdventureWorks"),
        context: "AppDbContext",
      }),
    ).toBe("AdventureWorks");
  });

  it("falls back to context then Unnamed", () => {
    expect(
      connectionDisplayName({
        ...createSampleConnection(""),
        name: "  ",
        context: "AppDbContext",
      }),
    ).toBe("AppDbContext");

    expect(
      connectionDisplayName({
        ...createSampleConnection(""),
        name: "",
        context: "",
      }),
    ).toBe("Unnamed");
  });
});

describe("duplicateConnection", () => {
  it("creates a new id and copy suffix", () => {
    const original = createSampleConnection("Primary");
    const copy = duplicateConnection(original);

    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toBe("Primary (copy)");
    expect(copy.context).toBe(original.context);
  });
});

describe("resolveSearchDirectory", () => {
  it("uses the project directory when available", () => {
    expect(
      resolveSearchDirectory(createSampleConnection(), "/workspace", "/workspace/src/App.csproj"),
    ).toBe("/workspace/src");
  });

  it("resolves relative search directories against the workspace", () => {
    const connection = {
      ...createSampleConnection(),
      searchDirectory: "./queries",
    };

    expect(resolveSearchDirectory(connection, "/workspace", "")).toBe("/workspace/queries");
  });
});

describe("workspaceConnectionToSettings", () => {
  it("normalizes script usings", () => {
    const settings = workspaceConnectionToSettings(
      {
        ...createSampleConnection(),
        scriptUsings: ["using MyApp.Helpers;", "global using System.Linq;"],
      },
      "/workspace",
      "efvibe",
      "/workspace",
    );

    expect(settings.scriptUsings).toEqual(["MyApp.Helpers", "System.Linq"]);
  });

  it("keeps script search path relative to the workspace file", () => {
    const settings = workspaceConnectionToSettings(
      {
        ...createSampleConnection(),
        scriptSearchPath: "./scripts",
        scriptLoads: ["helpers.csx"],
      },
      "/workspace",
      "efvibe",
      "/workspace",
    );

    expect(settings.workspaceFileDirectory).toBe("/workspace");
    expect(settings.scriptSearchPath).toBe("./scripts");
    expect(settings.scriptLoads).toEqual(["helpers.csx"]);
    expect(resolveScriptSearchPath(
      {
        ...createSampleConnection(),
        scriptSearchPath: "./scripts",
      },
      "/workspace",
    )).toBe("/workspace/scripts");
  });

  it("defaults script search path to scripts beside the workspace file", () => {
    const settings = workspaceConnectionToSettings(
      createSampleConnection(),
      "/workspace",
      "efvibe",
      "/workspace",
    );

    expect(settings.scriptSearchPath).toBe("scripts");
    expect(resolveScriptSearchPath(createSampleConnection(), "/workspace")).toBe("/workspace/scripts");
  });
});
