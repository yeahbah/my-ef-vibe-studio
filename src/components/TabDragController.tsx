import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { findPaneDropTargetAtPoint } from "../lib/tabDragDom";
import {
  cancelTabDragSession,
  finishTabDragSession,
  hasTabDragSession,
  isTabDragActive,
  updateTabDragSession,
} from "../lib/tabDragSession";
import type { PaneDropSide, TabDragPayload } from "../types/queryPaneLayout";

interface TabDragControllerProps {
  onDrop: (payload: TabDragPayload, targetPaneId: string, side: PaneDropSide) => void;
}

interface DropOverlayState {
  rect: DOMRect;
  side: PaneDropSide;
}

export function TabDragController({ onDrop }: TabDragControllerProps) {
  const [overlay, setOverlay] = useState<DropOverlayState | null>(null);
  const pendingDropRef = useRef<{ paneId: string; side: PaneDropSide } | null>(null);
  const onDropRef = useRef(onDrop);

  useEffect(() => {
    onDropRef.current = onDrop;
  }, [onDrop]);

  const updateDropTarget = useCallback((clientX: number, clientY: number) => {
    const target = findPaneDropTargetAtPoint(clientX, clientY);
    if (target) {
      pendingDropRef.current = { paneId: target.paneId, side: target.side };
      setOverlay((current) => {
        if (
          current
          && current.side === target.side
          && current.rect.left === target.rect.left
          && current.rect.top === target.rect.top
          && current.rect.width === target.rect.width
          && current.rect.height === target.rect.height
        ) {
          return current;
        }

        return { rect: target.rect, side: target.side };
      });
      return;
    }

    pendingDropRef.current = null;
    setOverlay(null);
  }, []);

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number, buttons = 1) => {
      if (!hasTabDragSession()) {
        return;
      }

      if (!updateTabDragSession(clientX, clientY, buttons)) {
        if (!isTabDragActive()) {
          pendingDropRef.current = null;
          setOverlay(null);
        }

        return;
      }

      updateDropTarget(clientX, clientY);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!hasTabDragSession()) {
        return;
      }

      event.preventDefault();
      handleMove(event.clientX, event.clientY, event.buttons);
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!hasTabDragSession()) {
        return;
      }

      event.preventDefault();
      handleMove(event.clientX, event.clientY, event.buttons);
    };

    const finish = () => {
      if (!hasTabDragSession()) {
        return;
      }

      const payload = finishTabDragSession();
      const pending = pendingDropRef.current;
      pendingDropRef.current = null;
      setOverlay(null);

      if (payload && pending) {
        onDropRef.current(payload, pending.paneId, pending.side);
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!hasTabDragSession()) {
        return;
      }

      event.preventDefault();
      finish();
    };

    const onMouseUp = (event: MouseEvent) => {
      if (!hasTabDragSession()) {
        return;
      }

      event.preventDefault();
      finish();
    };

    const onPointerCancel = () => {
      if (!hasTabDragSession()) {
        return;
      }

      cancelTabDragSession();
      pendingDropRef.current = null;
      setOverlay(null);
    };

    const onBlur = () => {
      if (!hasTabDragSession()) {
        return;
      }

      cancelTabDragSession();
      pendingDropRef.current = null;
      setOverlay(null);
    };

    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("mouseup", onMouseUp, true);
    document.addEventListener("pointercancel", onPointerCancel, true);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("pointermove", onPointerMove, true);
      document.removeEventListener("mousemove", onMouseMove, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("mouseup", onMouseUp, true);
      document.removeEventListener("pointercancel", onPointerCancel, true);
      window.removeEventListener("blur", onBlur);
    };
  }, [updateDropTarget]);

  useEffect(() => {
    document.body.classList.toggle("tab-dragging", isTabDragActive() || overlay !== null);
    return () => {
      document.body.classList.remove("tab-dragging");
    };
  }, [overlay]);

  if (!overlay) {
    return null;
  }

  return createPortal(
    <div
      className="query-pane-drop-overlay tab-drag-floating"
      aria-hidden="true"
      style={{
        position: "fixed",
        left: overlay.rect.left,
        top: overlay.rect.top,
        width: overlay.rect.width,
        height: overlay.rect.height,
      }}
    >
      <div className={`query-pane-drop-zone left${overlay.side === "left" ? " active" : ""}`} />
      <div className={`query-pane-drop-zone center${overlay.side === "center" ? " active" : ""}`} />
      <div className={`query-pane-drop-zone right${overlay.side === "right" ? " active" : ""}`} />
    </div>,
    document.body,
  );
}
