import type { ReactNode } from "react";
import type { PaneLeaf } from "../types/queryPaneLayout";

interface QueryPaneShellProps {
  pane: PaneLeaf;
  isFocused: boolean;
  onFocus: () => void;
  children: ReactNode;
}

export function QueryPaneShell({
  pane,
  isFocused,
  onFocus,
  children,
}: QueryPaneShellProps) {
  return (
    <div
      className={`query-pane${isFocused ? " focused" : ""}`}
      data-pane-id={pane.id}
      onMouseDown={onFocus}
    >
      {children}
    </div>
  );
}
