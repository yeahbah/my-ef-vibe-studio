import type { TabDragPayload } from "../types/queryPaneLayout";

const DRAG_THRESHOLD_PX = 4;

let activeDrag: TabDragPayload | null = null;

let dragSession: {
  payload: TabDragPayload;
  startX: number;
  startY: number;
} | null = null;

let dragActive = false;
let suppressNextClick = false;

export function beginTabDragSession(
  payload: TabDragPayload,
  clientX: number,
  clientY: number,
): void {
  dragSession = { payload, startX: clientX, startY: clientY };
  dragActive = false;
  activeDrag = null;
}

export function updateTabDragSession(clientX: number, clientY: number, buttons = 1): boolean {
  if (!dragSession) {
    return false;
  }

  if ((buttons & 1) === 0) {
    return dragActive;
  }

  if (!dragActive) {
    const distance = Math.hypot(clientX - dragSession.startX, clientY - dragSession.startY);
    if (distance < DRAG_THRESHOLD_PX) {
      return false;
    }

    dragActive = true;
    activeDrag = dragSession.payload;
  }

  return true;
}

export function finishTabDragSession(): TabDragPayload | null {
  if (!dragSession) {
    return null;
  }

  const payload = dragActive ? dragSession.payload : null;
  if (dragActive) {
    suppressNextClick = true;
  }

  resetDragSession();
  return payload;
}

export function cancelTabDragSession(): void {
  resetDragSession();
}

export function isTabDragActive(): boolean {
  return dragActive;
}

export function hasTabDragSession(): boolean {
  return dragSession !== null;
}

export function getActiveTabDrag(): TabDragPayload | null {
  return activeDrag;
}

export function consumeTabClickSuppression(): boolean {
  if (suppressNextClick) {
    suppressNextClick = false;
    return true;
  }

  return false;
}

function resetDragSession(): void {
  dragSession = null;
  dragActive = false;
  activeDrag = null;
}
