import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";

const DEFAULT_COL_WIDTH = 120;
const MIN_COL_WIDTH = 56;
const MAX_COL_WIDTH = 480;

interface ResultGridProps {
  columns: string[];
  rows: Array<Record<string, string>>;
}

function defaultWidthForColumn(column: string): number {
  return Math.min(MAX_COL_WIDTH, Math.max(DEFAULT_COL_WIDTH, column.length * 7 + 28));
}

export function ResultGrid({ columns, rows }: ResultGridProps) {
  const columnsKey = columns.join("\0");
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(columns.map((column) => [column, defaultWidthForColumn(column)])),
  );
  const resizeRef = useRef<
    | {
        column: string;
        pointerId: number;
        startX: number;
        startWidth: number;
      }
    | undefined
  >(undefined);

  useEffect(() => {
    setColumnWidths((current) => {
      const next: Record<string, number> = {};
      for (const column of columns) {
        next[column] = current[column] ?? defaultWidthForColumn(column);
      }
      return next;
    });
  }, [columnsKey, columns]);

  const tableWidth = useMemo(
    () => columns.reduce((total, column) => total + (columnWidths[column] ?? DEFAULT_COL_WIDTH), 0),
    [columnWidths, columns],
  );

  const onResizePointerDown = useCallback(
    (column: string, event: PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      resizeRef.current = {
        column,
        pointerId: event.pointerId,
        startX: event.clientX,
        startWidth: columnWidths[column] ?? DEFAULT_COL_WIDTH,
      };
    },
    [columnWidths],
  );

  const onResizePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) {
      return;
    }

    const delta = event.clientX - resize.startX;
    const nextWidth = Math.min(
      MAX_COL_WIDTH,
      Math.max(MIN_COL_WIDTH, resize.startWidth + delta),
    );

    setColumnWidths((current) => ({
      ...current,
      [resize.column]: nextWidth,
    }));
  }, []);

  const onResizePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    resizeRef.current = undefined;
  }, []);

  return (
    <div className="table-wrap result-grid">
      <table className="result-table" style={{ width: tableWidth }}>
        <colgroup>
          {columns.map((column) => (
            <col key={column} style={{ width: columnWidths[column] ?? DEFAULT_COL_WIDTH }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} className="result-table-header">
                <span className="result-table-header-label" title={column}>
                  {column}
                </span>
                <div
                  className="result-table-resize-handle"
                  role="separator"
                  aria-orientation="vertical"
                  aria-label={`Resize ${column} column`}
                  onPointerDown={(event) => onResizePointerDown(column, event)}
                  onPointerMove={onResizePointerMove}
                  onPointerUp={onResizePointerUp}
                  onPointerCancel={onResizePointerUp}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => {
                const value = row[column] ?? "";
                return (
                  <td key={column} title={value}>
                    <span className="result-table-cell">{value}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
