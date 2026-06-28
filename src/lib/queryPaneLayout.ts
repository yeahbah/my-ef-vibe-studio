import type { PaneDropSide, PaneLayoutNode, PaneLeaf, PaneSplit } from "../types/queryPaneLayout";

export function createPaneLeaf(tabIds: string[], activeTabId: string): PaneLeaf {
  const ids = [...tabIds];
  const active = ids.includes(activeTabId) ? activeTabId : (ids[0] ?? "");

  return {
    kind: "leaf",
    id: crypto.randomUUID(),
    tabIds: ids,
    activeTabId: active,
  };
}

export function createSinglePaneLayout(tabIds: string[], activeTabId: string): PaneLeaf {
  return createPaneLeaf(tabIds, activeTabId);
}

export function findPaneById(node: PaneLayoutNode, paneId: string): PaneLeaf | undefined {
  if (node.kind === "leaf") {
    return node.id === paneId ? node : undefined;
  }

  return findPaneById(node.first, paneId) ?? findPaneById(node.second, paneId);
}

export function findPaneContainingTab(node: PaneLayoutNode, tabId: string): PaneLeaf | undefined {
  if (node.kind === "leaf") {
    return node.tabIds.includes(tabId) ? node : undefined;
  }

  return findPaneContainingTab(node.first, tabId) ?? findPaneContainingTab(node.second, tabId);
}

export function getFirstPaneId(node: PaneLayoutNode): string {
  if (node.kind === "leaf") {
    return node.id;
  }

  return getFirstPaneId(node.first);
}

export function collectAllTabIds(node: PaneLayoutNode): string[] {
  if (node.kind === "leaf") {
    return [...node.tabIds];
  }

  return [...collectAllTabIds(node.first), ...collectAllTabIds(node.second)];
}

export function normalizePaneLayout(
  layout: PaneLayoutNode,
  tabIds: string[],
  activeTabId: string,
): PaneLeaf {
  const allowed = new Set(tabIds);
  const normalized = normalizeNode(layout, allowed);

  if (!normalized) {
    return createSinglePaneLayout(tabIds, activeTabId);
  }

  if (normalized.kind === "split") {
    return createSinglePaneLayout(tabIds, activeTabId);
  }

  const leafTabIds = normalized.tabIds.filter((id) => allowed.has(id));
  const missing = tabIds.filter((id) => !leafTabIds.includes(id));
  const mergedTabIds = [...leafTabIds, ...missing];
  const active = mergedTabIds.includes(activeTabId)
    ? activeTabId
    : mergedTabIds.includes(normalized.activeTabId)
      ? normalized.activeTabId
      : (mergedTabIds[0] ?? "");

  return {
    ...normalized,
    tabIds: mergedTabIds,
    activeTabId: active,
  };
}

function normalizeNode(node: PaneLayoutNode, allowed: Set<string>): PaneLayoutNode | null {
  if (node.kind === "leaf") {
    const tabIds = node.tabIds.filter((id) => allowed.has(id));
    if (tabIds.length === 0) {
      return null;
    }

    const activeTabId = tabIds.includes(node.activeTabId) ? node.activeTabId : tabIds[0];
    return { ...node, tabIds, activeTabId };
  }

  const first = normalizeNode(node.first, allowed);
  const second = normalizeNode(node.second, allowed);

  if (first && second) {
    return { ...node, first, second };
  }

  return first ?? second;
}

function replacePane(
  node: PaneLayoutNode,
  paneId: string,
  replacement: PaneLayoutNode,
): PaneLayoutNode {
  if (node.kind === "leaf") {
    return node.id === paneId ? replacement : node;
  }

  return {
    ...node,
    first: replacePane(node.first, paneId, replacement),
    second: replacePane(node.second, paneId, replacement),
  };
}

function collapse(node: PaneLayoutNode): PaneLayoutNode | null {
  if (node.kind === "leaf") {
    return node.tabIds.length > 0 ? node : null;
  }

  const first = collapse(node.first);
  const second = collapse(node.second);

  if (first && second) {
    return { ...node, first, second };
  }

  return first ?? second;
}

function withoutTab(leaf: PaneLeaf, tabId: string): PaneLeaf {
  const index = leaf.tabIds.indexOf(tabId);
  const tabIds = leaf.tabIds.filter((id) => id !== tabId);
  let activeTabId = leaf.activeTabId;

  if (leaf.activeTabId === tabId) {
    const nextIndex = Math.min(index, tabIds.length - 1);
    activeTabId = tabIds[Math.max(0, nextIndex)] ?? "";
  }

  return { ...leaf, tabIds, activeTabId };
}

function withTab(leaf: PaneLeaf, tabId: string, makeActive: boolean): PaneLeaf {
  if (leaf.tabIds.includes(tabId)) {
    return makeActive ? { ...leaf, activeTabId: tabId } : leaf;
  }

  return {
    ...leaf,
    tabIds: [...leaf.tabIds, tabId],
    activeTabId: makeActive ? tabId : leaf.activeTabId,
  };
}

export function setPaneActiveTab(layout: PaneLayoutNode, paneId: string, tabId: string): PaneLayoutNode {
  const pane = findPaneById(layout, paneId);
  if (!pane || !pane.tabIds.includes(tabId)) {
    return layout;
  }

  return replacePane(layout, paneId, { ...pane, activeTabId: tabId });
}

export function addTabToPane(
  layout: PaneLayoutNode,
  paneId: string,
  tabId: string,
): { layout: PaneLayoutNode; focusedPaneId: string } {
  const pane = findPaneById(layout, paneId);
  if (!pane) {
    return { layout, focusedPaneId: paneId };
  }

  const existing = findPaneContainingTab(layout, tabId);
  let nextLayout = layout;

  if (existing && existing.id !== paneId) {
    const stripped = replacePane(nextLayout, existing.id, withoutTab(existing, tabId));
    const collapsed = collapse(stripped);
    nextLayout = collapsed ?? createSinglePaneLayout([tabId], tabId);
  }

  const target = findPaneById(nextLayout, paneId) ?? findPaneById(nextLayout, getFirstPaneId(nextLayout));
  if (!target) {
    const leaf = createSinglePaneLayout([tabId], tabId);
    return { layout: leaf, focusedPaneId: leaf.id };
  }

  const updated = replacePane(nextLayout, target.id, withTab(target, tabId, true));
  const collapsed = collapse(updated);

  return {
    layout: collapsed ?? createSinglePaneLayout([tabId], tabId),
    focusedPaneId: target.id,
  };
}

export function splitPaneWithTab(
  layout: PaneLayoutNode,
  sourcePaneId: string,
  tabId: string,
  side: Exclude<PaneDropSide, "center">,
): { layout: PaneLayoutNode; focusedPaneId: string } | null {
  const source = findPaneById(layout, sourcePaneId);
  if (!source || !source.tabIds.includes(tabId)) {
    return null;
  }

  const remaining = withoutTab(source, tabId);
  const movedPane = createPaneLeaf([tabId], tabId);

  if (remaining.tabIds.length === 0) {
    const next = replacePane(layout, sourcePaneId, movedPane);
    const collapsed = collapse(next);
    return collapsed
      ? { layout: collapsed, focusedPaneId: movedPane.id }
      : { layout: movedPane, focusedPaneId: movedPane.id };
  }

  const split: PaneSplit = {
    kind: "split",
    id: crypto.randomUUID(),
    ratio: 0.5,
    first: side === "left" ? movedPane : remaining,
    second: side === "left" ? remaining : movedPane,
  };

  const next = replacePane(layout, sourcePaneId, split);
  const collapsed = collapse(next);

  return collapsed
    ? { layout: collapsed, focusedPaneId: movedPane.id }
    : { layout: split, focusedPaneId: movedPane.id };
}

export function moveTabToPane(
  layout: PaneLayoutNode,
  tabId: string,
  sourcePaneId: string,
  targetPaneId: string,
): { layout: PaneLayoutNode; focusedPaneId: string } | null {
  if (sourcePaneId === targetPaneId) {
    const pane = findPaneById(layout, sourcePaneId);
    return pane ? { layout, focusedPaneId: pane.id } : null;
  }

  const source = findPaneById(layout, sourcePaneId);
  const target = findPaneById(layout, targetPaneId);
  if (!source || !target || !source.tabIds.includes(tabId)) {
    return null;
  }

  let next = replacePane(layout, sourcePaneId, withoutTab(source, tabId));
  next = replacePane(next, targetPaneId, withTab(findPaneById(next, targetPaneId)!, tabId, true));
  const collapsed = collapse(next);

  if (!collapsed) {
    return null;
  }

  return { layout: collapsed, focusedPaneId: targetPaneId };
}

export function removeTabFromLayout(
  layout: PaneLayoutNode,
  tabId: string,
): { layout: PaneLayoutNode | null; focusedPaneId: string | null } {
  const owner = findPaneContainingTab(layout, tabId);
  if (!owner) {
    return { layout, focusedPaneId: getFirstPaneId(layout) };
  }

  const next = replacePane(layout, owner.id, withoutTab(owner, tabId));
  const collapsed = collapse(next);

  if (!collapsed) {
    return { layout: null, focusedPaneId: null };
  }

  const focusedPane = findPaneById(collapsed, owner.id) ?? findPaneById(collapsed, getFirstPaneId(collapsed));
  return {
    layout: collapsed,
    focusedPaneId: focusedPane?.id ?? getFirstPaneId(collapsed),
  };
}

export function setSplitRatio(layout: PaneLayoutNode, splitId: string, ratio: number): PaneLayoutNode {
  if (layout.kind === "leaf") {
    return layout;
  }

  const clamped = Math.min(0.95, Math.max(0.05, ratio));

  if (layout.id === splitId) {
    return { ...layout, ratio: clamped };
  }

  return {
    ...layout,
    first: setSplitRatio(layout.first, splitId, ratio),
    second: setSplitRatio(layout.second, splitId, ratio),
  };
}

export function dropTabOnPane(
  layout: PaneLayoutNode,
  tabId: string,
  _sourcePaneId: string,
  targetPaneId: string,
  side: PaneDropSide,
): { layout: PaneLayoutNode; focusedPaneId: string } | null {
  const owner = findPaneContainingTab(layout, tabId);
  if (!owner) {
    return null;
  }

  if (side === "center") {
    return moveTabToPane(layout, tabId, owner.id, targetPaneId);
  }

  let next = replacePane(layout, owner.id, withoutTab(owner, tabId));
  const collapsed = collapse(next);
  if (!collapsed) {
    return null;
  }

  let target = findPaneById(collapsed, targetPaneId) ?? findPaneById(collapsed, getFirstPaneId(collapsed));
  if (!target) {
    return null;
  }

  next = replacePane(collapsed, target.id, withTab(target, tabId, true));
  return splitPaneWithTab(next, target.id, tabId, side);
}

export function setPaneSqlPaneOpen(
  layout: PaneLayoutNode,
  paneId: string,
  open: boolean,
): PaneLayoutNode {
  const pane = findPaneById(layout, paneId);
  if (!pane) {
    return layout;
  }

  return replacePane(layout, paneId, { ...pane, sqlPaneOpen: open });
}

export function migrateLegacySqlPaneOpen(
  layout: PaneLayoutNode,
  legacyOpen: boolean | undefined,
): PaneLayoutNode {
  if (legacyOpen === undefined) {
    return layout;
  }

  let hasPerPaneSetting = false;
  mapPaneLeaves(layout, (leaf) => {
    if (leaf.sqlPaneOpen !== undefined) {
      hasPerPaneSetting = true;
    }
    return leaf;
  });

  if (hasPerPaneSetting) {
    return layout;
  }

  return mapPaneLeaves(layout, (leaf) => ({ ...leaf, sqlPaneOpen: legacyOpen }));
}

function mapPaneLeaves(
  node: PaneLayoutNode,
  map: (leaf: PaneLeaf) => PaneLeaf,
): PaneLayoutNode {
  if (node.kind === "leaf") {
    return map(node);
  }

  return {
    ...node,
    first: mapPaneLeaves(node.first, map),
    second: mapPaneLeaves(node.second, map),
  };
}

export function resolveDropSide(clientX: number, rect: DOMRect): PaneDropSide {
  const relative = (clientX - rect.left) / rect.width;
  if (relative < 0.25) {
    return "left";
  }

  if (relative > 0.75) {
    return "right";
  }

  return "center";
}
