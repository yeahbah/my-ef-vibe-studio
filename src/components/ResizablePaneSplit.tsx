import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";

const MIN_PANE_FRACTION = 0.15;

interface ResizablePaneSplitProps {
  splitId: string;
  ratio: number;
  onRatioChange: (splitId: string, ratio: number) => void;
  first: ReactNode;
  second: ReactNode;
}

export function ResizablePaneSplit({
  splitId,
  ratio,
  onRatioChange,
  first,
  second,
}: ResizablePaneSplitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ratioRef = useRef(ratio);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    ratioRef.current = ratio;
  }, [ratio]);

  const applyPointerRatio = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const next = (clientX - rect.left) / rect.width;
      onRatioChange(splitId, Math.min(1 - MIN_PANE_FRACTION, Math.max(MIN_PANE_FRACTION, next)));
    },
    [onRatioChange, splitId],
  );

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      draggingRef.current = true;
      setDragging(true);
      applyPointerRatio(event.clientX);
    },
    [applyPointerRatio],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) {
        return;
      }

      applyPointerRatio(event.clientX);
    },
    [applyPointerRatio],
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

  const firstFlex = ratio;
  const secondFlex = 1 - ratio;

  return (
    <div
      ref={containerRef}
      className={`query-pane-split${dragging ? " resizing" : ""}`}
    >
      <div className="query-pane-split-child" style={{ flex: firstFlex }}>
        {first}
      </div>
      <div
        className={`resize-handle vertical${dragging ? " dragging" : ""}`}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize split panes"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
      <div className="query-pane-split-child" style={{ flex: secondFlex }}>
        {second}
      </div>
    </div>
  );
}
