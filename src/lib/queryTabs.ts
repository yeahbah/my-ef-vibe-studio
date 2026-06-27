import type { QueryTab } from "../types/query";

export function cycleQueryTabId(
  tabs: QueryTab[],
  activeTabId: string,
  direction: 1 | -1,
): string | undefined {
  if (tabs.length <= 1) {
    return activeTabId || tabs[0]?.id;
  }

  const index = tabs.findIndex((tab) => tab.id === activeTabId);
  const start = index >= 0 ? index : 0;
  const nextIndex = (start + direction + tabs.length) % tabs.length;
  return tabs[nextIndex]?.id;
}
