import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppTheme } from "../types/theme";
import { MermaidView } from "./MermaidView";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const ZOOM_STEP = 0.25;
const PAN_STEP = 80;

interface ErDiagramViewportInfo {
  dbSet?: string;
  entityType?: string;
  visibleCount?: number;
  totalCount?: number;
  showAllTables?: boolean;
  dbContext?: string;
}

interface ErDiagramViewportProps {
  source: string;
  theme: AppTheme;
  info?: ErDiagramViewportInfo;
}

export function ErDiagramViewport({ source, theme, info }: ErDiagramViewportProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null>(
    null,
  );
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const zoomIn = useCallback(() => {
    setScale((current) => Math.min(MAX_ZOOM, Number((current + ZOOM_STEP).toFixed(2))));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((current) => Math.max(MIN_ZOOM, Number((current - ZOOM_STEP).toFixed(2))));
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const fitToView = useCallback(() => {
    const canvas = canvasRef.current;
    const svg = canvas?.querySelector("svg");

    if (!canvas || !svg) {
      return;
    }

    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;
    const svgBox = svg.viewBox?.baseVal;
    const svgWidth = svgBox?.width || svg.getBoundingClientRect().width;
    const svgHeight = svgBox?.height || svg.getBoundingClientRect().height;

    if (!svgWidth || !svgHeight || !canvasWidth || !canvasHeight) {
      resetView();
      return;
    }

    const padding = 32;
    const scaleX = (canvasWidth - padding) / svgWidth;
    const scaleY = (canvasHeight - padding) / svgHeight;
    const nextScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(scaleX, scaleY, 1)));

    setScale(Number(nextScale.toFixed(2)));
    setOffset({
      x: Math.max(16, (canvasWidth - svgWidth * nextScale) / 2),
      y: Math.max(16, (canvasHeight - svgHeight * nextScale) / 2),
    });
  }, [resetView]);

  useEffect(() => {
    resetView();
  }, [resetView, source]);

  const pan = useCallback((deltaX: number, deltaY: number) => {
    setOffset((current) => ({
      x: current.x + deltaX,
      y: current.y + deltaY,
    }));
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (event.deltaY < 0) {
      setScale((current) => Math.min(MAX_ZOOM, Number((current + ZOOM_STEP).toFixed(2))));
      return;
    }

    setScale((current) => Math.max(MIN_ZOOM, Number((current - ZOOM_STEP).toFixed(2))));
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [offset.x, offset.y]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    setOffset({
      x: drag.offsetX + (event.clientX - drag.x),
      y: drag.offsetY + (event.clientY - drag.y),
    });
  }, []);

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;
    setDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const viewportKey = useMemo(() => source, [source]);

  return (
    <div className="er-diagram-viewport">
      <div
        ref={canvasRef}
        className={`er-diagram-canvas${dragging ? " dragging" : ""}`}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className="er-diagram-transform-layer"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
        >
          <MermaidView key={viewportKey} source={source} theme={theme} />
        </div>
      </div>

      <div className="er-diagram-viewport-float-stack">
        <div className="er-diagram-viewport-toolbar" aria-label="Diagram controls">
          <div className="er-diagram-zoom-controls">
            <button type="button" onClick={zoomOut} title="Zoom out" aria-label="Zoom out">
              −
            </button>
            <span className="er-diagram-zoom-value">{Math.round(scale * 100)}%</span>
            <button type="button" onClick={zoomIn} title="Zoom in" aria-label="Zoom in">
              +
            </button>
            <button type="button" onClick={resetView} title="Reset view">
              Reset
            </button>
            <button type="button" onClick={fitToView} title="Fit to view">
              Fit
            </button>
          </div>

          <div className="er-diagram-pan-controls" aria-label="Pan">
            <div className="er-diagram-pan-pad">
              <button type="button" className="pan-up" onClick={() => pan(0, PAN_STEP)} title="Pan up" aria-label="Pan up">
                ↑
              </button>
              <button
                type="button"
                className="pan-left"
                onClick={() => pan(PAN_STEP, 0)}
                title="Pan left"
                aria-label="Pan left"
              >
                ←
              </button>
              <button type="button" className="pan-center" onClick={resetView} title="Reset view" aria-label="Reset view">
                ◎
              </button>
              <button
                type="button"
                className="pan-right"
                onClick={() => pan(-PAN_STEP, 0)}
                title="Pan right"
                aria-label="Pan right"
              >
                →
              </button>
              <button
                type="button"
                className="pan-down"
                onClick={() => pan(0, -PAN_STEP)}
                title="Pan down"
                aria-label="Pan down"
              >
                ↓
              </button>
            </div>
          </div>
        </div>

        {info ? (
          <div className="er-diagram-viewport-info" aria-label="Diagram details">
            {info.showAllTables && info.totalCount ? (
              <p className="muted">Showing all {info.totalCount} tables in the model.</p>
            ) : null}
            {!info.showAllTables && info.dbSet && info.entityType ? (
              <p>
                <span className="muted">Focused on</span> {info.dbSet}
                <span className="muted"> · </span>
                {info.entityType}
                {info.visibleCount !== undefined && info.totalCount !== undefined ? (
                  <>
                    <span className="muted"> · showing </span>
                    {info.visibleCount} of {info.totalCount} tables
                  </>
                ) : null}
              </p>
            ) : null}
            {info.dbContext ? (
              <p>
                <span className="muted">DbContext</span> {info.dbContext}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
