import { describe, expect, it } from "vitest";
import type { PaneLayoutNode, PaneLeaf, PaneSplit } from "../types/queryPaneLayout";
import {
  addTabToPane,
  createSinglePaneLayout,
  findPaneById,
  moveTabToPane,
  normalizePaneLayout,
  removeTabFromLayout,
  splitPaneWithTab,
} from "./queryPaneLayout";

function expectSplit(node: PaneLayoutNode): PaneSplit {
  expect(node.kind).toBe("split");
  return node as PaneSplit;
}

function expectLeaf(node: PaneLayoutNode): PaneLeaf {
  expect(node.kind).toBe("leaf");
  return node as PaneLeaf;
}

describe("queryPaneLayout", () => {
  it("creates a single pane with tabs", () => {
    const layout = createSinglePaneLayout(["a", "b"], "b");
    expect(layout.tabIds).toEqual(["a", "b"]);
    expect(layout.activeTabId).toBe("b");
  });

  it("splits a tab to the right", () => {
    const layout = createSinglePaneLayout(["a", "b"], "a");
    const result = splitPaneWithTab(layout, layout.id, "b", "right");
    expect(result).not.toBeNull();

    const split = expectSplit(result!.layout);
    expect(expectLeaf(split.first).tabIds).toEqual(["a"]);
    expect(expectLeaf(split.second).tabIds).toEqual(["b"]);
    expect(result!.focusedPaneId).toBe(split.second.id);
  });

  it("moves a tab between panes", () => {
    const initial = createSinglePaneLayout(["a", "b"], "a");
    const splitResult = splitPaneWithTab(initial, initial.id, "b", "right");
    const layout = splitResult!.layout;
    const split = expectSplit(layout);
    const left = expectLeaf(split.first);
    const right = expectLeaf(split.second);

    const moved = moveTabToPane(layout, "b", right.id, left.id);
    expect(moved).not.toBeNull();
    expect(findPaneById(moved!.layout, left.id)?.tabIds).toEqual(["a", "b"]);
  });

  it("collapses an empty pane after removing the last tab", () => {
    const initial = createSinglePaneLayout(["a", "b"], "a");
    const splitResult = splitPaneWithTab(initial, initial.id, "b", "right");
    const layout = splitResult!.layout;
    const split = expectSplit(layout);
    const right = expectLeaf(split.second);

    const removed = removeTabFromLayout(layout, "b");
    expect(removed.layout?.kind).toBe("leaf");
    expect(findPaneById(removed.layout!, right.id)).toBeUndefined();
  });

  it("adds a tab to a focused pane", () => {
    const layout = createSinglePaneLayout(["a"], "a");
    const added = addTabToPane(layout, layout.id, "b");
    expect(findPaneById(added.layout, added.focusedPaneId)?.tabIds).toEqual(["a", "b"]);
  });

  it("normalizes saved layout against current tabs", () => {
    const layout = createSinglePaneLayout(["a", "b"], "a");
    const normalized = normalizePaneLayout(layout, ["a", "c"], "c");
    expect(normalized.tabIds).toEqual(["a", "c"]);
    expect(normalized.activeTabId).toBe("c");
  });
});
