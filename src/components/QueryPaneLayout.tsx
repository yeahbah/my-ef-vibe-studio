import type { ReactNode } from "react";
import type { PaneDropSide, PaneLayoutNode, PaneLeaf, TabDragPayload } from "../types/queryPaneLayout";
import { QueryPaneShell } from "./QueryPaneShell";
import { ResizablePaneSplit } from "./ResizablePaneSplit";

interface QueryPaneLayoutProps {
  layout: PaneLayoutNode;
  focusedPaneId: string;
  onSplitRatioChange: (splitId: string, ratio: number) => void;
  onFocusedPaneChange: (paneId: string) => void;
  onTabDrop: (payload: TabDragPayload, targetPaneId: string, side: PaneDropSide) => void;
  renderLeaf: (pane: PaneLeaf, isFocused: boolean) => ReactNode;
}

export function QueryPaneLayout({
  layout,
  focusedPaneId,
  onSplitRatioChange,
  onFocusedPaneChange,
  onTabDrop,
  renderLeaf,
}: QueryPaneLayoutProps) {
  const renderNode = (node: PaneLayoutNode): ReactNode => {
    if (node.kind === "leaf") {
      const isFocused = node.id === focusedPaneId;

      return (
        <QueryPaneShell
          key={node.id}
          pane={node}
          isFocused={isFocused}
          onFocus={() => onFocusedPaneChange(node.id)}
          onTabDrop={(payload, side) => onTabDrop(payload, node.id, side)}
        >
          {renderLeaf(node, isFocused)}
        </QueryPaneShell>
      );
    }

    return (
      <ResizablePaneSplit
        key={node.id}
        splitId={node.id}
        ratio={node.ratio}
        onRatioChange={onSplitRatioChange}
        first={renderNode(node.first)}
        second={renderNode(node.second)}
      />
    );
  };

  return <div className="query-pane-layout">{renderNode(layout)}</div>;
}
