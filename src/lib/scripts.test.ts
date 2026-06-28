import { describe, expect, it } from "vitest";
import {
  appendScriptLoad,
  isScriptFileName,
  isScriptInLoads,
  joinScriptPath,
  normalizeScriptDirectory,
  removeScriptLoad,
  scriptFileNameFromLoad,
} from "./scripts";

describe("scripts helpers", () => {
  it("detects csx files", () => {
    expect(isScriptFileName("helpers.csx")).toBe(true);
    expect(isScriptFileName("Helpers.CSX")).toBe(true);
    expect(isScriptFileName("helpers.cs")).toBe(false);
  });

  it("normalizes script directories", () => {
    expect(normalizeScriptDirectory("/tmp/scripts/")).toBe("/tmp/scripts");
    expect(normalizeScriptDirectory("  /tmp/scripts  ")).toBe("/tmp/scripts");
  });

  it("extracts file names from load paths", () => {
    expect(scriptFileNameFromLoad("helpers.csx")).toBe("helpers.csx");
    expect(scriptFileNameFromLoad("./scripts/helpers.csx")).toBe("helpers.csx");
    expect(scriptFileNameFromLoad("/tmp/scripts/helpers.csx")).toBe("helpers.csx");
  });

  it("joins script paths", () => {
    expect(joinScriptPath("/tmp/scripts", "helpers.csx")).toBe("/tmp/scripts/helpers.csx");
  });

  it("appends script loads without duplicates", () => {
    expect(appendScriptLoad(["helpers.csx"], "filters.csx")).toEqual([
      "helpers.csx",
      "filters.csx",
    ]);
    expect(appendScriptLoad(["helpers.csx"], "Helpers.CSX")).toEqual(["helpers.csx"]);
    expect(appendScriptLoad(["./scripts/helpers.csx"], "helpers.csx")).toEqual([
      "./scripts/helpers.csx",
    ]);
  });

  it("removes script loads and detects membership", () => {
    expect(removeScriptLoad(["helpers.csx", "filters.csx"], "filters.csx")).toEqual([
      "helpers.csx",
    ]);
    expect(isScriptInLoads(["./scripts/helpers.csx"], "helpers.csx")).toBe(true);
    expect(isScriptInLoads(["helpers.csx"], "missing.csx")).toBe(false);
  });
});
