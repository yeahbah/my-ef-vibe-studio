import { resolveDropSide } from "./queryPaneLayout";
import type { PaneDropSide } from "../types/queryPaneLayout";

export interface PaneDropTarget {
  paneId: string;
  side: PaneDropSide;
  rect: DOMRect;
}

export function findPaneDropTargetAtPoint(clientX: number, clientY: number): PaneDropTarget | null {
  const panes = document.querySelectorAll<HTMLElement>("[data-pane-id]");

  for (const pane of panes) {
    const paneId = pane.dataset.paneId;
    if (!paneId) {
      continue;
    }

    const rect = pane.getBoundingClientRect();
    if (
      clientX < rect.left
      || clientX > rect.right
      || clientY < rect.top
      || clientY > rect.bottom
    ) {
      continue;
    }

    return {
      paneId,
      side: resolveDropSide(clientX, rect),
      rect,
    };
  }

  return null;
}
