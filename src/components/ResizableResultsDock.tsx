import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

export const DEFAULT_RESULTS_DOCK_HEIGHT = 220;
export const MIN_RESULTS_DOCK_HEIGHT = 140;
export const MIN_EDITOR_HEIGHT = 120;
export const RESIZE_HANDLE_HEIGHT = 5;

interface ResizableResultsDockProps {
  height: number;
  onHeightChange: (height: number) => void;
  results: ReactNode;
  editor: ReactNode;
}

function clampHeight(height: number, containerHeight: number): number {
  const maxHeight = Math.max(
    MIN_RESULTS_DOCK_HEIGHT,
    containerHeight - MIN_EDITOR_HEIGHT - RESIZE_HANDLE_HEIGHT,
  );

  return Math.min(Math.max(height, MIN_RESULTS_DOCK_HEIGHT), maxHeight);
}

function resultsHeightFromPointer(clientY: number, container: DOMRect): number {
  const handleTop = clientY - container.top;
  return container.height - handleTop - RESIZE_HANDLE_HEIGHT;
}

export function ResizableResultsDock({
  height,
  onHeightChange,
  results,
  editor,
}: ResizableResultsDockProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  const heightRef = useRef(height);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    heightRef.current = height;
  }, [height]);

  const applyPointerHeight = useCallback(
    (clientY: number) => {
      const column = columnRef.current;
      if (!column) {
        return;
      }

      const rect = column.getBoundingClientRect();
      onHeightChange(clampHeight(resultsHeightFromPointer(clientY, rect), rect.height));
    },
    [onHeightChange],
  );

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      draggingRef.current = true;
      setDragging(true);
      applyPointerHeight(event.clientY);
    },
    [applyPointerHeight],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) {
        return;
      }

      applyPointerHeight(event.clientY);
    },
    [applyPointerHeight],
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

  const resetHeight = useCallback(() => {
    onHeightChange(DEFAULT_RESULTS_DOCK_HEIGHT);
  }, [onHeightChange]);

  useEffect(() => {
    const column = columnRef.current;
    if (!column) {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (draggingRef.current) {
        return;
      }

      const rect = column.getBoundingClientRect();
      const clamped = clampHeight(heightRef.current, rect.height);
      if (clamped !== heightRef.current) {
        onHeightChange(clamped);
      }
    });

    observer.observe(column);
    return () => observer.disconnect();
  }, [onHeightChange]);

  return (
    <div className={`main-column${dragging ? " resizing" : ""}`} ref={columnRef}>
      <section className="editor-dock-surface">{editor}</section>
      <div
        className={`resize-handle${dragging ? " dragging" : ""}`}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize results panel"
        aria-valuenow={height}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={resetHeight}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 40 : 16;
          const column = columnRef.current;
          const max = column
            ? Math.max(
                MIN_RESULTS_DOCK_HEIGHT,
                column.getBoundingClientRect().height -
                  MIN_EDITOR_HEIGHT -
                  RESIZE_HANDLE_HEIGHT,
              )
            : 600;

          if (event.key === "ArrowUp") {
            event.preventDefault();
            onHeightChange(Math.min(height + step, max));
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            onHeightChange(Math.max(height - step, MIN_RESULTS_DOCK_HEIGHT));
          } else if (event.key === "Home") {
            event.preventDefault();
            onHeightChange(MIN_RESULTS_DOCK_HEIGHT);
          } else if (event.key === "End") {
            event.preventDefault();
            if (column) {
              onHeightChange(
                clampHeight(Number.MAX_SAFE_INTEGER, column.getBoundingClientRect().height),
              );
            }
          }
        }}
      />
      <section className="results-pane" style={{ height }}>
        {results}
      </section>
    </div>
  );
}
