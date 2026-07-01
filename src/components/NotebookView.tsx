import { useState } from "react";
import { NotebookCellOutput, NotebookCellOutputPlaceholder } from "./NotebookCellOutput";
import { NotebookCodeEditor } from "./NotebookCodeEditor";
import { ConnectionPicker } from "./ConnectionPicker";
import { IconPlay, IconRunAbove, IconRunBelow } from "./icons";
import { renderNotebookMarkdown } from "../lib/notebookMarkdown";
import type { NotebookCell } from "../types/notebook";
import type { AppTheme } from "../types/theme";
import type { WorkspaceConnection } from "../types/workspace";

export type NotebookRunScope = "above" | "cell" | "below";

interface NotebookViewProps {
  connections: WorkspaceConnection[];
  connectionId: string;
  onConnectionChange: (connectionId: string) => void;
  name: string;
  cells: NotebookCell[];
  theme: AppTheme;
  running: boolean;
  runningCellId?: string;
  onNameChange: (name: string) => void;
  onCellChange: (cellId: string, value: string) => void;
  onAddCell: (kind: "code" | "markdown") => void;
  onInsertCell: (cellId: string, position: "above" | "below") => void;
  onRemoveCell: (cellId: string) => void;
  onMoveCell: (cellId: string, direction: "up" | "down") => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onRunAll: () => void;
  onRunCell: (cellId: string, scope: NotebookRunScope, source?: string) => void;
}

export function NotebookView({
  connections,
  connectionId,
  onConnectionChange,
  name,
  cells,
  theme,
  running,
  runningCellId,
  onNameChange,
  onCellChange,
  onAddCell,
  onInsertCell,
  onRemoveCell,
  onMoveCell,
  onOpen,
  onSave,
  onSaveAs,
  onRunAll,
  onRunCell,
}: NotebookViewProps) {
  const [editingMarkdownId, setEditingMarkdownId] = useState<string | undefined>();

  return (
    <section className="main-view notebook-view" aria-label="Notebook">
      <header className="notebook-view-header">
        <div className="notebook-view-title">
          <input
            className="notebook-name-input"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            aria-label="Notebook name"
          />
        </div>
        <div className="notebook-toolbar">
          <ConnectionPicker
            connections={connections}
            activeConnectionId={connectionId}
            onChange={onConnectionChange}
            ariaLabel="Connection for notebook"
          />
          <span className="notebook-toolbar-divider" aria-hidden="true" />
          <button type="button" disabled={running} onClick={onRunAll}>
            Run all
          </button>
          <button type="button" onClick={() => onAddCell("code")}>
            + Code
          </button>
          <button type="button" onClick={() => onAddCell("markdown")}>
            + Markdown
          </button>
          <span className="notebook-toolbar-divider" aria-hidden="true" />
          <button type="button" onClick={onOpen}>
            Open
          </button>
          <button type="button" onClick={onSave}>
            Save
          </button>
          <button type="button" onClick={onSaveAs}>
            Save as…
          </button>
        </div>
      </header>

      <div className="notebook-view-cells">
        {cells.map((cell, index) => (
          <NotebookCellRow
            key={cell.id}
            cell={cell}
            index={index}
            theme={theme}
            canRemove={cells.length > 1}
            canMoveUp={index > 0}
            canMoveDown={index < cells.length - 1}
            hasRunnableAbove={hasRunnableCodeCells(cells, index, "above")}
            hasRunnableBelow={hasRunnableCodeCells(cells, index, "below")}
            running={runningCellId === cell.id}
            notebookRunning={running}
            editingMarkdown={editingMarkdownId === cell.id}
            onStartEditMarkdown={() => setEditingMarkdownId(cell.id)}
            onStopEditMarkdown={() => setEditingMarkdownId(undefined)}
            onValueChange={(value) => onCellChange(cell.id, value)}
            onRemove={() => onRemoveCell(cell.id)}
            onInsert={(position) => onInsertCell(cell.id, position)}
            onMove={(direction) => onMoveCell(cell.id, direction)}
            onRun={(scope, source) => onRunCell(cell.id, scope, source)}
          />
        ))}
      </div>
    </section>
  );
}

function hasRunnableCodeCells(
  cells: NotebookCell[],
  index: number,
  scope: Exclude<NotebookRunScope, "cell">,
): boolean {
  return cells.some((cell, cellIndex) => {
    if (cell.kind !== "code" || !cell.value.trim()) {
      return false;
    }

    return scope === "above" ? cellIndex < index : cellIndex > index;
  });
}

function NotebookCellRow({
  cell,
  index,
  theme,
  canRemove,
  canMoveUp,
  canMoveDown,
  hasRunnableAbove,
  hasRunnableBelow,
  running,
  notebookRunning,
  editingMarkdown,
  onStartEditMarkdown,
  onStopEditMarkdown,
  onValueChange,
  onRemove,
  onInsert,
  onMove,
  onRun,
}: {
  cell: NotebookCell;
  index: number;
  theme: AppTheme;
  canRemove: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  hasRunnableAbove: boolean;
  hasRunnableBelow: boolean;
  running: boolean;
  notebookRunning: boolean;
  editingMarkdown: boolean;
  onStartEditMarkdown: () => void;
  onStopEditMarkdown: () => void;
  onValueChange: (value: string) => void;
  onRemove: () => void;
  onInsert: (position: "above" | "below") => void;
  onMove: (direction: "up" | "down") => void;
  onRun: (scope: NotebookRunScope, source?: string) => void;
}) {
  const isCode = cell.kind === "code";
  const isCommand = isCode && cell.value.trim().startsWith(":");
  const disabled = running || notebookRunning;
  const showOutput = isCode && cell.lastPayload && !running;
  const executionFailed = cell.executionStatus === "error" && cell.lastPayload && !cell.lastPayload.success;

  return (
    <article
      className={`notebook-cell-row ${isCode ? "notebook-cell-row-code" : "notebook-cell-row-markdown"} ${
        running ? "notebook-cell-row-running" : ""
      } ${executionFailed ? "notebook-cell-row-failed" : ""}`}
    >
      <div className="notebook-cell-gutter" aria-hidden={!isCode}>
        {isCode ? (
          <div className="notebook-cell-run-stack">
            <button
              type="button"
              className="notebook-cell-run notebook-cell-run-secondary"
              disabled={disabled || !hasRunnableAbove}
              title="Run cells above"
              aria-label="Run cells above"
              onClick={() => onRun("above")}
            >
              <IconRunAbove />
            </button>
            <button
              type="button"
              className="notebook-cell-run"
              disabled={disabled}
              title="Run cell (Ctrl+Enter)"
              aria-label="Run cell"
              onClick={() => onRun("cell")}
            >
              {running ? <span className="notebook-cell-spinner" /> : <IconPlay />}
            </button>
            <button
              type="button"
              className="notebook-cell-run notebook-cell-run-secondary"
              disabled={disabled || !hasRunnableBelow}
              title="Run cells below"
              aria-label="Run cells below"
              onClick={() => onRun("below")}
            >
              <IconRunBelow />
            </button>
          </div>
        ) : (
          <span className="notebook-cell-gutter-spacer">{index + 1}</span>
        )}
      </div>

      <div className="notebook-cell-body">
        <div className="notebook-cell-input">
          {isCode ? (
            <NotebookCodeEditor
              value={cell.value}
              language={isCommand ? "efvibe" : "csharp"}
              theme={theme}
              onChange={onValueChange}
              onRun={(source) => onRun("cell", source)}
            />
          ) : editingMarkdown ? (
            <textarea
              className="notebook-markdown-editor"
              value={cell.value}
              autoFocus
              onChange={(event) => onValueChange(event.target.value)}
              onBlur={onStopEditMarkdown}
              spellCheck={false}
            />
          ) : (
            <button
              type="button"
              className="notebook-markdown-render"
              onClick={onStartEditMarkdown}
            >
              <div
                dangerouslySetInnerHTML={{
                  __html: renderNotebookMarkdown(cell.value || "Empty markdown cell"),
                }}
              />
            </button>
          )}
        </div>

        {running ? (
          <div className="notebook-cell-output-wrap">
            <NotebookCellOutputPlaceholder message="Running…" />
          </div>
        ) : null}

        {showOutput ? (
          <div className="notebook-cell-output-wrap">
            <NotebookCellOutput
              key={`${cell.id}-${cell.executionStatus}-${cell.lastPayload!.metrics.totalMs}-${cell.lastPayload!.sql.join("\n")}-${(cell.lastPayload!.warnings ?? []).join("\n")}`}
              payload={cell.lastPayload!}
              markdown={cell.markdownOutput}
            />
          </div>
        ) : null}

        {isCode && executionFailed && cell.lastPayload?.error && !showOutput ? (
          <div className="notebook-cell-output-wrap">
            <NotebookCellOutputPlaceholder message={cell.lastPayload.error} />
          </div>
        ) : null}

        <div className="notebook-cell-footer">
          <span className="notebook-cell-meta">
            {isCode ? (isCommand ? "efvibe" : "C#") : "Markdown"}
          </span>
          <div className="notebook-cell-footer-actions">
            <button type="button" className="notebook-cell-action" onClick={() => onInsert("above")}>
              Add above
            </button>
            <button type="button" className="notebook-cell-action" onClick={() => onInsert("below")}>
              Add below
            </button>
            {canMoveUp ? (
              <button type="button" className="notebook-cell-action" onClick={() => onMove("up")}>
                Move up
              </button>
            ) : null}
            {canMoveDown ? (
              <button type="button" className="notebook-cell-action" onClick={() => onMove("down")}>
                Move down
              </button>
            ) : null}
            {canRemove ? (
              <button type="button" className="notebook-cell-action" onClick={onRemove}>
                Delete
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
