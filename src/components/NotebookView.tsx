import type { NotebookCell } from "../types/notebook";

interface NotebookViewProps {
  name: string;
  cells: NotebookCell[];
  running: boolean;
  onNameChange: (name: string) => void;
  onCellChange: (cellId: string, value: string) => void;
  onAddCell: () => void;
  onRemoveCell: (cellId: string) => void;
  onOpen: () => void;
  onSave: () => void;
  onRunAll: () => void;
}

export function NotebookView({
  name,
  cells,
  running,
  onNameChange,
  onCellChange,
  onAddCell,
  onRemoveCell,
  onOpen,
  onSave,
  onRunAll,
}: NotebookViewProps) {
  return (
    <section className="main-view notebook-view" aria-label="Notebook">
      <header className="notebook-view-header">
        <div className="notebook-view-title">
          <h2>Notebook</h2>
          <input
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            aria-label="Notebook name"
          />
        </div>
        <div className="notebook-toolbar">
          <button type="button" onClick={onOpen}>
            Open
          </button>
          <button type="button" onClick={onSave}>
            Save
          </button>
          <button type="button" disabled={running} onClick={onRunAll}>
            Run all
          </button>
          <button type="button" onClick={onAddCell}>
            Add cell
          </button>
        </div>
      </header>

      <div className="notebook-view-cells">
        {cells.map((cell, index) => (
          <section key={cell.id} className="notebook-cell">
            <div className="notebook-cell-header">
              <span>Cell {index + 1}</span>
              {cells.length > 1 ? (
                <button type="button" onClick={() => onRemoveCell(cell.id)}>
                  Remove
                </button>
              ) : null}
            </div>
            <textarea
              value={cell.value}
              onChange={(event) => onCellChange(cell.id, event.target.value)}
              spellCheck={false}
            />
          </section>
        ))}
      </div>
    </section>
  );
}
