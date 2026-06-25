import type { EvaluationHistoryEntry } from "../lib/history";
import type { BenchmarkResult } from "../lib/benchmark";

interface ChartsPanelProps {
  open: boolean;
  history: EvaluationHistoryEntry[];
  baseline?: EvaluationHistoryEntry;
  latest?: EvaluationHistoryEntry;
  benchmark?: BenchmarkResult;
  onClose: () => void;
}

export function ChartsPanel({
  open,
  history,
  baseline,
  latest,
  benchmark,
  onClose,
}: ChartsPanelProps) {
  if (!open) {
    return null;
  }

  const maxMs = Math.max(...history.map((entry) => entry.totalMs), benchmark?.maxMs ?? 0, 1);

  return (
    <div className="charts-overlay" onClick={onClose}>
      <section className="charts-panel" onClick={(event) => event.stopPropagation()}>
        <header className="charts-header">
          <h2>Session analytics</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <section>
          <h3>Recent timings</h3>
          {history.length === 0 ? (
            <p className="muted">Run queries to populate session charts.</p>
          ) : (
            <table className="charts-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Expression</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 15).map((entry, index) => (
                  <tr key={`${entry.timestamp}-${index}`}>
                    <td>{index + 1}</td>
                    <td>
                      <code>{truncate(entry.expression, 60)}</code>
                    </td>
                    <td>{entry.totalMs} ms</td>
                    <td>
                      <div
                        className="chart-bar"
                        style={{ width: `${Math.max(4, (entry.totalMs / maxMs) * 100)}%` }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h3>Compare baseline</h3>
          {baseline && latest ? (
            <table className="charts-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Baseline</th>
                  <th>Latest</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total</td>
                  <td>{baseline.totalMs} ms</td>
                  <td>{latest.totalMs} ms</td>
                </tr>
                <tr>
                  <td>Database</td>
                  <td>{baseline.databaseMs ?? "—"} ms</td>
                  <td>{latest.databaseMs ?? "—"} ms</td>
                </tr>
                <tr>
                  <td>Rows</td>
                  <td>{baseline.rowCount ?? "—"}</td>
                  <td>{latest.rowCount ?? "—"}</td>
                </tr>
                <tr>
                  <td>SQL commands</td>
                  <td>{baseline.sqlCommandCount}</td>
                  <td>{latest.sqlCommandCount}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="muted">Set a compare baseline from the run bar, then run another query.</p>
          )}
        </section>

        {benchmark ? (
          <section>
            <h3>Benchmark ({benchmark.iterations} runs)</h3>
            <p>
              Avg {benchmark.averageMs} ms · min {benchmark.minMs} ms · max {benchmark.maxMs} ms
            </p>
            <table className="charts-table">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {benchmark.samples.map((sample) => (
                  <tr key={sample.iteration}>
                    <td>{sample.iteration}</td>
                    <td>{sample.totalMs} ms</td>
                    <td>
                      <div
                        className="chart-bar"
                        style={{ width: `${Math.max(4, (sample.totalMs / maxMs) * 100)}%` }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
      </section>
    </div>
  );
}

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}
