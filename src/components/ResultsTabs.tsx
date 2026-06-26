import type { EvaluationJsonPayload } from "../types/evaluation";
import { ResultRowsView, ResultValueView } from "./ResultExplorer";
import { canExportPayload, escapeHtml, formatMetrics } from "../lib/resultFormat";
import type { ResultsTab } from "../types/query";
import { normalizeResultsTab } from "../types/query";

const RESULTS_TABS: Array<{ id: ResultsTab; label: string }> = [
  { id: "result", label: "Result" },
  { id: "plan", label: "Plan" },
  { id: "messages", label: "Messages" },
];

interface ResultsTabsProps {
  payload: EvaluationJsonPayload;
  activeTab: ResultsTab;
  onTabChange: (tab: ResultsTab) => void;
  onExport: (format: "csv" | "json") => void;
  onSaveRows?: (rows: Array<Record<string, string>>) => Promise<void>;
}

export function ResultsTabs({
  payload,
  activeTab,
  onTabChange,
  onExport,
  onSaveRows,
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
        {resolvedTab === "result" && <ResultBody payload={payload} onSaveRows={onSaveRows} />}
        {resolvedTab === "plan" && <PlanBody payload={payload} />}
        {resolvedTab === "messages" && <MessagesBody payload={payload} />}
      </div>
    </section>
  );
}

function ResultBody({
  payload,
  onSaveRows,
}: {
  payload: EvaluationJsonPayload;
  onSaveRows?: (rows: Array<Record<string, string>>) => Promise<void>;
}) {
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
    return <ResultRowsView rows={payload.rows} onSave={onSaveRows} />;
  }

  if (payload.value) {
    return <ResultValueView value={payload.value} />;
  }

  return <pre className="value-block">(null)</pre>;
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
