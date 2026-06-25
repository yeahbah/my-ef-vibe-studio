import type { EvaluationJsonPayload } from "../types/evaluation";
import { ResultExplorer } from "./ResultExplorer";
import { canExportPayload, escapeHtml, formatMetrics } from "../lib/resultFormat";

type ResultsTab = "result" | "explorer" | "sql" | "plan" | "messages";

interface ResultsTabsProps {
  payload: EvaluationJsonPayload;
  activeTab: ResultsTab;
  onTabChange: (tab: ResultsTab) => void;
  onExport: (format: "csv" | "json") => void;
}

export function ResultsTabs({
  payload,
  activeTab,
  onTabChange,
  onExport,
}: ResultsTabsProps) {
  const exportEnabled = canExportPayload(payload);

  return (
    <section className="results-panel">
      <div className="results-toolbar">
        <div className="tab-list">
          {(["result", "explorer", "sql", "plan", "messages"] as ResultsTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? "tab active" : "tab"}
              onClick={() => onTabChange(tab)}
            >
              {tab === "result"
                ? "Result"
                : tab === "explorer"
                  ? "Explorer"
                  : tab === "sql"
                    ? "SQL"
                    : tab === "plan"
                      ? "Plan"
                      : "Messages"}
            </button>
          ))}
        </div>
        <div className="results-actions">
          <button type="button" disabled={!exportEnabled} onClick={() => onExport("csv")}>
            Export CSV
          </button>
          <button type="button" disabled={!exportEnabled} onClick={() => onExport("json")}>
            Export JSON
          </button>
        </div>
      </div>

      <p className="metrics">{formatMetrics(payload)}</p>

      <div className="results-body">
        {activeTab === "result" && <ResultBody payload={payload} />}
        {activeTab === "explorer" && <ResultExplorer payload={payload} />}
        {activeTab === "sql" && <SqlBody payload={payload} />}
        {activeTab === "plan" && <PlanBody payload={payload} />}
        {activeTab === "messages" && <MessagesBody payload={payload} />}
      </div>
    </section>
  );
}

function ResultBody({ payload }: { payload: EvaluationJsonPayload }) {
  if (payload.metrics.resultKind === "pending") {
    return (
      <div className="welcome-state">
        <p className="muted">Run a query to see results here.</p>
      </div>
    );
  }

  if (!payload.success) {
    return <pre className="error-block">{payload.error ?? "Evaluation failed."}</pre>;
  }

  if (payload.rows && payload.rows.length > 0) {
    const columns = [...new Set(payload.rows.flatMap((row) => Object.keys(row)))];

    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payload.rows.map((row, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column}>{row[column] ?? ""}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <pre className="value-block">{payload.value ?? "(null)"}</pre>;
}

function SqlBody({ payload }: { payload: EvaluationJsonPayload }) {
  if (payload.sql.length === 0) {
    return <p className="muted">No SQL captured for this run.</p>;
  }

  return (
    <div className="stack">
      {payload.sql.map((sql, index) => (
        <section key={index}>
          <h3>{payload.sql.length > 1 ? `SQL ${index + 1}` : "SQL"}</h3>
          <pre>{sql}</pre>
        </section>
      ))}
      {payload.translatedSql && (
        <section>
          <h3>Translated SQL</h3>
          <pre>{payload.translatedSql}</pre>
        </section>
      )}
    </div>
  );
}

function PlanBody({ payload }: { payload: EvaluationJsonPayload }) {
  if (payload.queryPlan) {
    return <pre>{payload.queryPlan}</pre>;
  }

  return (
    <p className="muted">
      {payload.queryPlanNote ?? "No query plan captured. Use Run Plan to include EXPLAIN output."}
    </p>
  );
}

function MessagesBody({ payload }: { payload: EvaluationJsonPayload }) {
  if (payload.warnings.length === 0) {
    return <p className="muted">No warnings.</p>;
  }

  return (
    <ul
      className="warnings"
      dangerouslySetInnerHTML={{
        __html: payload.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join(""),
      }}
    />
  );
}
