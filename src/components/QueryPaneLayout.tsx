import type { ReactNode } from "react";
import type { PaneLayoutNode, PaneLeaf } from "../types/queryPaneLayout";
import { QueryPaneShell } from "./QueryPaneShell";
import { ResizablePaneSplit } from "./ResizablePaneSplit";

interface QueryPaneLayoutProps {
  layout: PaneLayoutNode;
  focusedPaneId: string;
  onSplitRatioChange: (splitId: string, ratio: number) => void;
  onFocusedPaneChange: (paneId: string) => void;
  renderLeaf: (pane: PaneLeaf, isFocused: boolean) => ReactNode;
}

export function QueryPaneLayout({
  layout,
  focusedPaneId,
  onSplitRatioChange,
  onFocusedPaneChange,
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
