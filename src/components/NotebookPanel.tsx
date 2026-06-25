import type { NotebookCell } from "../types/notebook";

interface NotebookPanelProps {
  open: boolean;
  name: string;
  cells: NotebookCell[];
  running: boolean;
  onClose: () => void;
  onNameChange: (name: string) => void;
  onCellChange: (cellId: string, value: string) => void;
  onAddCell: () => void;
  onRemoveCell: (cellId: string) => void;
  onOpen: () => void;
  onSave: () => void;
  onRunAll: () => void;
}

export function NotebookPanel({
  open,
  name,
  cells,
  running,
  onClose,
  onNameChange,
  onCellChange,
  onAddCell,
  onRemoveCell,
  onOpen,
  onSave,
  onRunAll,
}: NotebookPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="notebook-overlay">
      <div className="notebook-panel">
        <header className="notebook-header">
          <div>
            <h2>Notebook</h2>
            <input value={name} onChange={(event) => onNameChange(event.target.value)} />
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
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </header>
        <div className="notebook-cells">
          {cells.map((cell, index) => (
            <section key={cell.id} className="notebook-cell">
              <div className="notebook-cell-header">
                <span>Cell {index + 1}</span>
                {cells.length > 1 && (
                  <button type="button" onClick={() => onRemoveCell(cell.id)}>
                    Remove
                  </button>
                )}
              </div>
              <textarea
                value={cell.value}
                onChange={(event) => onCellChange(cell.id, event.target.value)}
                spellCheck={false}
              />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
