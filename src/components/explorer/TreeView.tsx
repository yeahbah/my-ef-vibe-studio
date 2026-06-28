import { useMemo } from "react";
import type { ContextMenuItem, ExplorerNode } from "./types";

interface TreeViewProps {
  nodes: ExplorerNode[];
  expandedIds: Set<string>;
  onToggleExpand: (nodeId: string) => void;
  onActivate: (node: ExplorerNode) => void;
  onContextMenu: (node: ExplorerNode | undefined, x: number, y: number) => void;
}

export function TreeView({
  nodes,
  expandedIds,
  onToggleExpand,
  onActivate,
  onContextMenu,
}: TreeViewProps) {
  const flatNodes = useMemo(() => flattenVisible(nodes, expandedIds), [nodes, expandedIds]);

  return (
    <div
      className="explorer-tree"
      role="tree"
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu(undefined, event.clientX, event.clientY);
      }}
    >
      {flatNodes.map(({ node, depth }) => {
        const hasChildren = Boolean(node.children?.length);
        const expanded = expandedIds.has(node.id);

        return (
          <div
            key={node.id}
            className={[
              "tree-row",
              node.active ? "active" : "",
              node.kind === "connection" && node.daemonConnected
                ? "tree-row-connection-daemon"
                : "",
              node.muted ? "muted" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            role="treeitem"
            aria-current={
              node.kind === "connection" && node.daemonConnected ? "true" : undefined
            }
            aria-expanded={hasChildren ? expanded : undefined}
            style={{ paddingLeft: `${8 + depth * 14}px` }}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onContextMenu(node, event.clientX, event.clientY);
            }}
            onDoubleClick={() => onActivate(node)}
          >
            <button
              type="button"
              className="tree-chevron-btn"
              aria-label={expanded ? "Collapse" : "Expand"}
              disabled={!hasChildren}
              onClick={(event) => {
                event.stopPropagation();
                if (hasChildren) {
                  onToggleExpand(node.id);
                }
              }}
            >
              {hasChildren ? (expanded ? "▾" : "▸") : "·"}
            </button>
            {node.kind === "connection" && node.daemonConnected ? (
              <span
                className="tree-connection-indicator connected"
                title="Connected to efvibe daemon"
                aria-hidden="true"
              />
            ) : null}
            <button
              type="button"
              className="tree-label-btn"
              onClick={() => {
                if (hasChildren) {
                  onToggleExpand(node.id);
                }
                onActivate(node);
              }}
            >
              <span className="tree-label">{node.label}</span>
              {node.subtitle ? <span className="tree-subtitle">{node.subtitle}</span> : null}
            </button>
            {node.kind === "git-file" ? (
              <input
                type="checkbox"
                className="tree-checkbox"
                checked={Boolean(node.checked)}
                onChange={() => onActivate(node)}
                onClick={(event) => event.stopPropagation()}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function flattenVisible(
  nodes: ExplorerNode[],
  expandedIds: Set<string>,
  depth = 0,
): Array<{ node: ExplorerNode; depth: number }> {
  const rows: Array<{ node: ExplorerNode; depth: number }> = [];

  for (const node of nodes) {
    rows.push({ node, depth });
    if (node.children?.length && expandedIds.has(node.id)) {
      rows.push(...flattenVisible(node.children, expandedIds, depth + 1));
    }
  }

  return rows;
}

export type { ContextMenuItem };
