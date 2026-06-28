import { describe, expect, it, afterEach } from "vitest";
import {
  beginTabDragSession,
  cancelTabDragSession,
  consumeTabClickSuppression,
  finishTabDragSession,
  hasTabDragSession,
  isTabDragActive,
  updateTabDragSession,
} from "./tabDragSession";

afterEach(() => {
  cancelTabDragSession();
});

describe("tabDragSession", () => {
  const payload = { tabId: "tab-1", sourcePaneId: "pane-a" };

  it("starts drag after the movement threshold", () => {
    beginTabDragSession(payload, 0, 0);

    expect(updateTabDragSession(2, 2)).toBe(false);
    expect(isTabDragActive()).toBe(false);

    expect(updateTabDragSession(12, 0)).toBe(true);
    expect(isTabDragActive()).toBe(true);
    expect(finishTabDragSession()).toEqual(payload);
    expect(consumeTabClickSuppression()).toBe(true);
    expect(hasTabDragSession()).toBe(false);
  });

  it("cancels an in-progress drag", () => {
    beginTabDragSession(payload, 0, 0);
    expect(updateTabDragSession(20, 0)).toBe(true);

    cancelTabDragSession();
    expect(isTabDragActive()).toBe(false);
    expect(finishTabDragSession()).toBeNull();
  });
});
