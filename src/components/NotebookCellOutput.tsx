import type { EvaluationJsonPayload } from "../types/evaluation";
import { escapeHtml } from "../lib/resultFormat";
import { renderNotebookMarkdown } from "../lib/notebookMarkdown";

interface NotebookCellOutputProps {
  payload: EvaluationJsonPayload;
  /** When true, render payload.value as markdown (command cells). */
  markdown?: boolean;
}

export function NotebookCellOutput({ payload, markdown = false }: NotebookCellOutputProps) {
  if (markdown && payload.value) {
    return (
      <div
        className="notebook-output notebook-output-markdown"
        dangerouslySetInnerHTML={{ __html: renderNotebookMarkdown(payload.value) }}
      />
    );
  }

  if (!payload.success && payload.error && !payload.rows?.length && !payload.value) {
    return (
      <div className="notebook-output notebook-output-error-block">
        <pre>{payload.error}</pre>
      </div>
    );
  }

  const rows = payload.rows ?? [];
  const warnings = payload.warnings ?? [];
  const sql = payload.sql ?? [];

  return (
    <div className="notebook-output">
      <p className="notebook-output-summary">
        <strong className={payload.success ? "notebook-output-ok" : "notebook-output-fail"}>
          {payload.success ? "Success" : "Failed"}
        </strong>
        <span>
          · {payload.metrics.totalMs} ms
          {payload.metrics.databaseMs !== undefined ? ` · db ${payload.metrics.databaseMs} ms` : ""}
          {payload.metrics.rowCount !== undefined ? ` · ${payload.metrics.rowCount} row(s)` : ""}
        </span>
      </p>

      {payload.error ? <pre className="notebook-output-error">{payload.error}</pre> : null}

      {rows.length > 0 ? (
        <div className="notebook-output-table-wrap">
          <table className="notebook-output-table">
            <thead>
              <tr>
                <th className="notebook-output-rownum">#</th>
                {Object.keys(rows[0] ?? {}).map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="notebook-output-rownum">{rowIndex + 1}</td>
                  {Object.keys(rows[0] ?? {}).map((column) => (
                    <td key={column}>{row[column] ?? ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : payload.value ? (
        <p className="notebook-output-scalar">{payload.value}</p>
      ) : null}

      {warnings.length > 0 ? (
        <section className="notebook-output-section">
          <h4>Warnings</h4>
          <ul>
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {sql.length > 0 ? (
        <section className="notebook-output-section">
          <h4>SQL</h4>
          {sql.map((entry, index) => (
            <pre key={index}>{entry}</pre>
          ))}
        </section>
      ) : null}

      {payload.queryPlan ? (
        <section className="notebook-output-section">
          <h4>Query Plan</h4>
          <pre>{payload.queryPlan}</pre>
        </section>
      ) : payload.queryPlanNote ? (
        <section className="notebook-output-section">
          <h4>Query Plan</h4>
          <pre>{payload.queryPlanNote}</pre>
        </section>
      ) : null}
    </div>
  );
}

export function NotebookCellOutputPlaceholder({ message }: { message: string }) {
  return (
    <div className="notebook-output notebook-output-placeholder">
      <pre>{escapeHtml(message)}</pre>
    </div>
  );
}
