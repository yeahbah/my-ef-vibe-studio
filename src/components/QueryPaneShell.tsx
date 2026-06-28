import { useCallback, useState, type DragEvent, type ReactNode } from "react";
import { resolveDropSide } from "../lib/queryPaneLayout";
import type { PaneDropSide, PaneLeaf, TabDragPayload } from "../types/queryPaneLayout";
import { TAB_DRAG_MIME } from "../types/queryPaneLayout";

interface QueryPaneShellProps {
  pane: PaneLeaf;
  isFocused: boolean;
  onFocus: () => void;
  onTabDrop: (payload: TabDragPayload, side: PaneDropSide) => void;
  children: ReactNode;
}

function readDragPayload(event: DragEvent): TabDragPayload | undefined {
  const raw = event.dataTransfer.getData(TAB_DRAG_MIME);
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as TabDragPayload;
  } catch {
    return undefined;
  }
}

export function QueryPaneShell({
  pane: _pane,
  isFocused,
  onFocus,
  onTabDrop,
  children,
}: QueryPaneShellProps) {
  const [dropHint, setDropHint] = useState<PaneDropSide | null>(null);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes(TAB_DRAG_MIME)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropHint(resolveDropSide(event.clientX, event.currentTarget.getBoundingClientRect()));
  }, []);

  const onDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setDropHint(null);
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDropHint(null);

      const payload = readDragPayload(event);
      if (!payload) {
        return;
      }

      const side = resolveDropSide(event.clientX, event.currentTarget.getBoundingClientRect());
      onTabDrop(payload, side);
    },
    [onTabDrop],
  );

  return (
    <div
      className={`query-pane${isFocused ? " focused" : ""}`}
      onMouseDown={onFocus}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}
      {dropHint ? (
        <div className="query-pane-drop-overlay" aria-hidden="true">
          <div className={`query-pane-drop-zone left${dropHint === "left" ? " active" : ""}`} />
          <div className={`query-pane-drop-zone center${dropHint === "center" ? " active" : ""}`} />
          <div className={`query-pane-drop-zone right${dropHint === "right" ? " active" : ""}`} />
        </div>
      ) : null}
    </div>
  );
}

export function encodeTabDragPayload(payload: TabDragPayload): string {
  return JSON.stringify(payload);
}
