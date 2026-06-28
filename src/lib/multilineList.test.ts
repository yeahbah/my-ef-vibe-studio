import { describe, expect, it } from "vitest";
import { splitMultilineList } from "./multilineList";

describe("splitMultilineList", () => {
  it("splits non-empty lines and trims entries", () => {
    expect(splitMultilineList("MyApp.Helpers\n  System.Linq  \n")).toEqual([
      "MyApp.Helpers",
      "System.Linq",
    ]);
  });

  it("ignores blank lines", () => {
    expect(splitMultilineList("One\n\nTwo")).toEqual(["One", "Two"]);
  });
});
