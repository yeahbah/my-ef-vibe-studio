import { describe, expect, it } from "vitest";
import { cycleQueryTabId } from "./queryTabs";
import type { QueryTab } from "../types/query";

function tab(id: string): QueryTab {
  return {
    id,
    name: id,
    expression: "",
    connectionId: "conn",
    filePath: "",
    activeResultsTab: "result",
  };
}

describe("cycleQueryTabId", () => {
  const tabs = [tab("a"), tab("b"), tab("c")];

  it("returns the next tab", () => {
    expect(cycleQueryTabId(tabs, "a", 1)).toBe("b");
    expect(cycleQueryTabId(tabs, "c", 1)).toBe("a");
  });

  it("returns the previous tab", () => {
    expect(cycleQueryTabId(tabs, "b", -1)).toBe("a");
    expect(cycleQueryTabId(tabs, "a", -1)).toBe("c");
  });

  it("leaves a single tab unchanged", () => {
    expect(cycleQueryTabId([tab("only")], "only", 1)).toBe("only");
  });
});
