import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";

const DEFAULT_COL_WIDTH = 120;
const MIN_COL_WIDTH = 56;
const MAX_COL_WIDTH = 480;

interface GridCellCoord {
  rowIndex: number;
  column: string;
}

function sameCell(a: GridCellCoord | null, b: GridCellCoord | null): boolean {
  return a?.rowIndex === b?.rowIndex && a?.column === b?.column;
}

interface ResultGridProps {
  columns: string[];
  rows: Array<Record<string, string>>;
  editable?: boolean;
  rowOffset?: number;
  /** Changes when the underlying result set is replaced (not on inline edits). */
  resetKey?: string;
  onCellChange?: (rowIndex: number, column: string, value: string) => void;
  onDeleteRow?: (rowIndex: number) => void;
}

function defaultWidthForColumn(column: string): number {
  return Math.min(MAX_COL_WIDTH, Math.max(DEFAULT_COL_WIDTH, column.length * 7 + 28));
}

export function ResultGrid({
  columns,
  rows,
  editable = false,
  rowOffset = 0,
  resetKey,
  onCellChange,
  onDeleteRow,
}: ResultGridProps) {
  const displayColumns = editable ? ["", ...columns] : columns;
  const columnsKey = displayColumns.join("\0");
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      displayColumns.map((column) => [
        column || "__actions__",
        column ? defaultWidthForColumn(column) : 44,
      ]),
    ),
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
  const [selectedCell, setSelectedCell] = useState<GridCellCoord | null>(null);
  const [editingCell, setEditingCell] = useState<GridCellCoord | null>(null);

  useEffect(() => {
    setSelectedCell(null);
    setEditingCell(null);
  }, [resetKey, columnsKey, rowOffset]);

  useEffect(() => {
    setColumnWidths((current) => {
      const next: Record<string, number> = {};
      for (const column of displayColumns) {
        const key = column || "__actions__";
        next[key] =
          current[key] ?? (column ? defaultWidthForColumn(column) : 44);
      }
      return next;
    });
  }, [columnsKey, displayColumns]);

  const tableWidth = useMemo(
    () =>
      displayColumns.reduce(
        (total, column) =>
          total + (columnWidths[column || "__actions__"] ?? DEFAULT_COL_WIDTH),
        0,
      ),
    [columnWidths, displayColumns],
  );

  const onResizePointerDown = useCallback(
    (column: string, event: PointerEvent<HTMLDivElement>) => {
      if (!column) {
        return;
      }

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
          {displayColumns.map((column) => (
            <col
              key={column || "__actions__"}
              style={{ width: columnWidths[column || "__actions__"] ?? DEFAULT_COL_WIDTH }}
            />
          ))}
        </colgroup>
        <thead>
          <tr>
            {displayColumns.map((column) =>
              column ? (
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
              ) : (
                <th key="__actions__" className="result-table-header result-table-actions-header" />
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const absoluteRowIndex = rowOffset + rowIndex;
            return (
              <tr key={absoluteRowIndex}>
                {editable ? (
                  <td className="result-table-actions-cell">
                    <button
                      type="button"
                      className="result-table-delete-btn"
                      aria-label={`Delete row ${absoluteRowIndex + 1}`}
                      title="Delete row"
                      onClick={() => onDeleteRow?.(absoluteRowIndex)}
                    >
                      ×
                    </button>
                  </td>
                ) : null}
                {columns.map((column) => {
                  const value = row[column] ?? "";
                  const cell: GridCellCoord = { rowIndex: absoluteRowIndex, column };
                  const isSelected = sameCell(selectedCell, cell);
                  const isEditing = editable && sameCell(editingCell, cell);

                  return (
                    <td
                      key={column}
                      className={isSelected ? "result-table-data-cell-selected" : undefined}
                      title={editable && !isEditing ? value : undefined}
                    >
                      {editable ? (
                        <EditableCell
                          value={value}
                          editing={isEditing}
                          selected={isSelected}
                          onSelect={() => {
                            setSelectedCell(cell);
                            setEditingCell(null);
                          }}
                          onStartEdit={() => {
                            setSelectedCell(cell);
                            setEditingCell(cell);
                          }}
                          onStopEdit={() => setEditingCell(null)}
                          onChange={(nextValue) =>
                            onCellChange?.(absoluteRowIndex, column, nextValue)
                          }
                        />
                      ) : (
                        <span className="result-table-cell">{value}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EditableCell({
  value,
  editing,
  selected,
  onSelect,
  onStartEdit,
  onStopEdit,
  onChange,
}: {
  value: string;
  editing: boolean;
  selected: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      return;
    }

    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="result-table-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onStopEdit}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === "Escape") {
            event.preventDefault();
            onStopEdit();
          }
        }}
        spellCheck={false}
      />
    );
  }

  return (
    <span
      className={selected ? "result-table-cell result-table-cell-selected" : "result-table-cell"}
      onClick={onSelect}
      onDoubleClick={onStartEdit}
    >
      {value}
    </span>
  );
}
