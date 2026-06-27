import { describe, expect, it } from "vitest";
import {
  isScriptFileName,
  joinScriptPath,
  normalizeScriptDirectory,
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
});
