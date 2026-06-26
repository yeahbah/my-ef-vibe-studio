import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";

export const DEFAULT_EDITOR_TOOL_PANEL_WIDTH = 300;
export const MIN_EDITOR_TOOL_PANEL_WIDTH = 240;
export const MAX_EDITOR_TOOL_PANEL_WIDTH = 560;
export const MIN_EDITOR_SHELL_MAIN_WIDTH = 280;
export const EDITOR_TOOL_RAIL_WIDTH = 40;
export const TOOL_PANEL_RESIZE_HANDLE_WIDTH = 5;

interface ResizableEditorToolPanelProps {
  width: number;
  onWidthChange: (width: number) => void;
  children: ReactNode;
}

function clampWidth(width: number, shellWidth: number): number {
  const maxWidth = Math.min(
    MAX_EDITOR_TOOL_PANEL_WIDTH,
    shellWidth - EDITOR_TOOL_RAIL_WIDTH - MIN_EDITOR_SHELL_MAIN_WIDTH - TOOL_PANEL_RESIZE_HANDLE_WIDTH,
  );

  return Math.min(
    Math.max(width, MIN_EDITOR_TOOL_PANEL_WIDTH),
    Math.max(MIN_EDITOR_TOOL_PANEL_WIDTH, maxWidth),
  );
}

function panelWidthFromPointer(clientX: number, shellLeft: number): number {
  return clientX - shellLeft;
}

export function ResizableEditorToolPanel({
  width,
  onWidthChange,
  children,
}: ResizableEditorToolPanelProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(width);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  const applyPointerWidth = useCallback(
    (clientX: number) => {
      const shell = shellRef.current;
      const editorShell = shell?.parentElement;
      if (!shell || !editorShell) {
        return;
      }

      const shellRect = shell.getBoundingClientRect();
      const editorShellRect = editorShell.getBoundingClientRect();
      onWidthChange(
        clampWidth(panelWidthFromPointer(clientX, shellRect.left), editorShellRect.width),
      );
    },
    [onWidthChange],
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
    const editorShell = shellRef.current?.parentElement;
    if (!editorShell) {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (draggingRef.current) {
        return;
      }

      const rect = editorShell.getBoundingClientRect();
      const clamped = clampWidth(widthRef.current, rect.width);
      if (clamped !== widthRef.current) {
        onWidthChange(clamped);
      }
    });

    observer.observe(editorShell);
    return () => observer.disconnect();
  }, [onWidthChange]);

  return (
    <div
      ref={shellRef}
      className={`editor-tool-panel-shell${dragging ? " resizing" : ""}`}
      style={{ width }}
    >
      {children}
      <div
        className={`resize-handle vertical${dragging ? " dragging" : ""}`}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize tool panel"
        aria-valuenow={width}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => onWidthChange(DEFAULT_EDITOR_TOOL_PANEL_WIDTH)}
      />
    </div>
  );
}
