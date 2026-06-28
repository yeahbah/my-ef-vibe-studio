export interface PaneLeaf {
  kind: "leaf";
  id: string;
  tabIds: string[];
  activeTabId: string;
  /** Per-pane LINQ/SQL preview panel visibility. */
  sqlPaneOpen?: boolean;
}

export interface PaneSplit {
  kind: "split";
  id: string;
  /** Fraction of width given to the first child (0.05–0.95). */
  ratio: number;
  first: PaneLayoutNode;
  second: PaneLayoutNode;
}

export type PaneLayoutNode = PaneLeaf | PaneSplit;

export const TAB_DRAG_MIME = "application/x-efvibe-query-tab";

export interface TabDragPayload {
  tabId: string;
  sourcePaneId: string;
}

export type PaneDropSide = "left" | "right" | "center";
