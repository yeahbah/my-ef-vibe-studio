export type ExplorerNodeKind =
  | "section"
  | "connection"
  | "dbset"
  | "property"
  | "query"
  | "snippet"
  | "history"
  | "git-file"
  | "pack"
  | "folder"
  | "info";

export interface ExplorerNode {
  id: string;
  label: string;
  subtitle?: string;
  kind: ExplorerNodeKind;
  children?: ExplorerNode[];
  active?: boolean;
  checked?: boolean;
  muted?: boolean;
}

export interface ContextMenuItem {
  id: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}

export const DEFAULT_EXPLORER_EXPANDED = [
  "workspace",
  "connections",
  "queries",
];

export function normalizeExplorerExpandedNodes(
  ids: string[],
  activeConnectionId: string,
): string[] {
  const normalized = ids.filter((id) => id !== "model");
  if (ids.includes("model") && activeConnectionId) {
    normalized.push(`connection:${activeConnectionId}`, `model:${activeConnectionId}`);
  }

  return [...new Set(normalized)];
}

export function resolveExplorerExpandedNodes(
  expanded?: string[],
  legacySidebarTab?: string,
): string[] {
  if (expanded?.length) {
    return expanded;
  }

  const base = [...DEFAULT_EXPLORER_EXPANDED];
  switch (legacySidebarTab) {
    case "scan":
      return [...base, "scan"];
    case "team":
      return [...base, "team"];
    default:
      return base;
  }
}
