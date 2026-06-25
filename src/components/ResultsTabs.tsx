import type { EvaluationJsonPayload } from "../types/evaluation";
import { ResultRowsView, ResultValueView } from "./ResultExplorer";
import { canExportPayload, escapeHtml, formatMetrics } from "../lib/resultFormat";
import type { ResultsTab } from "../types/query";
import { normalizeResultsTab } from "../types/query";

const RESULTS_TABS: Array<{ id: ResultsTab; label: string }> = [
  { id: "result", label: "Result" },
  { id: "sql", label: "SQL" },
  { id: "plan", label: "Plan" },
  { id: "messages", label: "Messages" },
];

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
  const messageCount = payload.warnings.length;
  const resolvedTab = normalizeResultsTab(activeTab);

  return (
    <section className="results-panel">
      <header className="results-tab-bar">
        <div className="results-tabs" role="tablist" aria-label="Results">
          {RESULTS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`results-tab-${tab.id}`}
              aria-selected={resolvedTab === tab.id}
              aria-controls={`results-panel-${tab.id}`}
              className={resolvedTab === tab.id ? "results-tab active" : "results-tab"}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
              {tab.id === "messages" && messageCount > 0 ? (
                <span className="results-tab-badge">{messageCount}</span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="results-tab-actions">
          <span className="results-metrics">{formatMetrics(payload)}</span>
          <button type="button" disabled={!exportEnabled} onClick={() => onExport("csv")}>
            CSV
          </button>
          <button type="button" disabled={!exportEnabled} onClick={() => onExport("json")}>
            JSON
          </button>
        </div>
      </header>

      <div
        className="results-body"
        role="tabpanel"
        id={`results-panel-${resolvedTab}`}
        aria-labelledby={`results-tab-${resolvedTab}`}
      >
        {resolvedTab === "result" && <ResultBody payload={payload} />}
        {resolvedTab === "sql" && <SqlBody payload={payload} />}
        {resolvedTab === "plan" && <PlanBody payload={payload} />}
        {resolvedTab === "messages" && <MessagesBody payload={payload} />}
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
    return <ResultRowsView rows={payload.rows} />;
  }

  if (payload.value) {
    return <ResultValueView value={payload.value} />;
  }

  return <pre className="value-block">(null)</pre>;
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
