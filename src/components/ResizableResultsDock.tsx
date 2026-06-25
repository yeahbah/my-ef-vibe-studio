import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export const DEFAULT_RESULTS_DOCK_HEIGHT = 220;
export const MIN_RESULTS_DOCK_HEIGHT = 120;
export const MIN_EDITOR_HEIGHT = 120;

interface ResizableResultsDockProps {
  height: number;
  onHeightChange: (height: number) => void;
  results: ReactNode;
  editor: ReactNode;
}

function clampHeight(height: number, containerHeight: number): number {
  const maxHeight = Math.max(
    MIN_RESULTS_DOCK_HEIGHT,
    containerHeight - MIN_EDITOR_HEIGHT,
  );

  return Math.min(Math.max(height, MIN_RESULTS_DOCK_HEIGHT), maxHeight);
}

export function ResizableResultsDock({
  height,
  onHeightChange,
  results,
  editor,
}: ResizableResultsDockProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const startResize = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(true);
    },
    [],
  );

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const column = columnRef.current;
      if (!column) {
        return;
      }

      const rect = column.getBoundingClientRect();
      const nextHeight = clampHeight(rect.bottom - event.clientY, rect.height);
      onHeightChange(nextHeight);
    };

    const handleMouseUp = () => {
      setDragging(false);
    };

    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, onHeightChange]);

  const resetHeight = useCallback(() => {
    onHeightChange(DEFAULT_RESULTS_DOCK_HEIGHT);
  }, [onHeightChange]);

  return (
    <div className={`main-column${dragging ? " resizing" : ""}`} ref={columnRef}>
      <section className="editor-pane">{editor}</section>
      <div
        className={`resize-handle${dragging ? " dragging" : ""}`}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize results panel"
        aria-valuenow={height}
        tabIndex={0}
        onMouseDown={startResize}
        onDoubleClick={resetHeight}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 40 : 16;
          if (event.key === "ArrowUp") {
            event.preventDefault();
            const column = columnRef.current;
            const max = column
              ? Math.max(
                  MIN_RESULTS_DOCK_HEIGHT,
                  column.getBoundingClientRect().height - MIN_EDITOR_HEIGHT,
                )
              : 600;
            onHeightChange(Math.min(height + step, max));
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            onHeightChange(Math.max(height - step, MIN_RESULTS_DOCK_HEIGHT));
          } else if (event.key === "Home") {
            event.preventDefault();
            onHeightChange(MIN_RESULTS_DOCK_HEIGHT);
          } else if (event.key === "End") {
            event.preventDefault();
            const column = columnRef.current;
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
