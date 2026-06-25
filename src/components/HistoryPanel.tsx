import type { EvaluationHistoryEntry } from "../lib/history";

interface HistoryPanelProps {
  history: EvaluationHistoryEntry[];
  onSelect: (expression: string) => void;
}

export function HistoryPanel({ history, onSelect }: HistoryPanelProps) {
  if (history.length === 0) {
    return (
      <section className="sidebar-panel">
        <h3>History</h3>
        <p className="muted">Recent query runs appear here.</p>
      </section>
    );
  }

  return (
    <section className="sidebar-panel">
      <h3>History</h3>
      <ul className="history-list">
        {history.map((entry, index) => (
          <li key={`${entry.timestamp}-${index}`}>
            <button type="button" className="history-item" onClick={() => onSelect(entry.expression)}>
              <code>{entry.expression}</code>
              <small>
                {entry.connectionName} · {entry.totalMs} ms
                {entry.rowCount !== undefined ? ` · ${entry.rowCount} row(s)` : ""}
              </small>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
