import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

interface EditorWorkspaceProps {
  editor: ReactNode;
  sqlPane: ReactNode;
  sqlPaneOpen: boolean;
  onSqlPaneOpenChange: (open: boolean) => void;
  sqlPaneWidth: number;
  onSqlPaneWidthChange: (width: number) => void;
}

const MIN_SQL_PANE_WIDTH = 220;
const MIN_EDITOR_WIDTH = 280;

export function EditorWorkspace({
  editor,
  sqlPane,
  sqlPaneOpen,
  onSqlPaneOpenChange,
  sqlPaneWidth,
  onSqlPaneWidthChange,
}: EditorWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const startResize = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const nextWidth = Math.min(
        Math.max(rect.right - event.clientX, MIN_SQL_PANE_WIDTH),
        rect.width - MIN_EDITOR_WIDTH,
      );
      onSqlPaneWidthChange(nextWidth);
    };

    const handleMouseUp = () => setDragging(false);

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, onSqlPaneWidthChange]);

  return (
    <div className={`editor-workspace${dragging ? " resizing" : ""}`} ref={containerRef}>
      <div className="editor-column">
        <section className="editor-main">{editor}</section>
        <aside className="editor-rail" role="toolbar" aria-label="Editor tools">
          <button
            type="button"
            className={`editor-rail-btn${sqlPaneOpen ? " active" : ""}`}
            title="Toggle LINQ/SQL preview pane"
            aria-pressed={sqlPaneOpen}
            onClick={() => onSqlPaneOpenChange(!sqlPaneOpen)}
          >
            <span className="editor-rail-label">Linq/Sql</span>
          </button>
        </aside>
      </div>
      {sqlPaneOpen ? (
        <>
          <div
            className={`resize-handle vertical${dragging ? " dragging" : ""}`}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize SQL pane"
            onMouseDown={startResize}
          />
          <section className="sql-pane" style={{ width: sqlPaneWidth }}>
            {sqlPane}
          </section>
        </>
      ) : null}
    </div>
  );
}
