import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";

export const DEFAULT_EXPLORER_WIDTH = 240;
export const MIN_EXPLORER_WIDTH = 180;
export const MAX_EXPLORER_WIDTH = 560;
export const MIN_MAIN_STACK_WIDTH = 320;
export const EXPLORER_RESIZE_HANDLE_WIDTH = 5;

interface ResizableWorkspaceLayoutProps {
  explorerOpen: boolean;
  explorerWidth: number;
  onExplorerWidthChange: (width: number) => void;
  explorer: ReactNode;
  children: ReactNode;
}

function clampExplorerWidth(width: number, containerWidth: number): number {
  const maxWidth = Math.min(
    MAX_EXPLORER_WIDTH,
    containerWidth - MIN_MAIN_STACK_WIDTH - EXPLORER_RESIZE_HANDLE_WIDTH,
  );

  return Math.min(
    Math.max(width, MIN_EXPLORER_WIDTH),
    Math.max(MIN_EXPLORER_WIDTH, maxWidth),
  );
}

export function ResizableWorkspaceLayout({
  explorerOpen,
  explorerWidth,
  onExplorerWidthChange,
  explorer,
  children,
}: ResizableWorkspaceLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(explorerWidth);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    widthRef.current = explorerWidth;
  }, [explorerWidth]);

  const applyPointerWidth = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      onExplorerWidthChange(clampExplorerWidth(clientX - rect.left, rect.width));
    },
    [onExplorerWidthChange],
  );

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      draggingRef.current = true;
      setDragging(true);
      applyPointerWidth(event.clientX);
    },
    [applyPointerWidth],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) {
        return;
      }

      applyPointerWidth(event.clientX);
    },
    [applyPointerWidth],
  );

  const endDrag = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) {
      return;
    }

    draggingRef.current = false;
    setDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !explorerOpen) {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (draggingRef.current) {
        return;
      }

      const clamped = clampExplorerWidth(widthRef.current, container.getBoundingClientRect().width);
      if (clamped !== widthRef.current) {
        onExplorerWidthChange(clamped);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [explorerOpen, onExplorerWidthChange]);

  return (
    <div
      ref={containerRef}
      className={[
        "workspace",
        explorerOpen ? "" : "explorer-hidden",
        dragging ? "resizing" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {explorerOpen ? (
        <>
          <div className="workspace-explorer" style={{ width: explorerWidth }}>
            {explorer}
          </div>
          <div
            className={`resize-handle vertical${dragging ? " dragging" : ""}`}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize workspace explorer"
            aria-valuenow={explorerWidth}
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onDoubleClick={() => onExplorerWidthChange(DEFAULT_EXPLORER_WIDTH)}
          />
        </>
      ) : null}
      {children}
    </div>
  );
}
