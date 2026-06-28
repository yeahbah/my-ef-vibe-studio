import type { EvaluationJsonPayload } from "../types/evaluation";
import { ResultRowsView, ResultValueView } from "./ResultExplorer";
import { canExportPayload, escapeHtml, formatMetrics } from "../lib/resultFormat";
import { resolveResultView } from "../lib/resultView";
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
        </div>
      </header>

      <div
        className="results-body"
        role="tabpanel"
        id={`results-panel-${resolvedTab}`}
        aria-labelledby={`results-tab-${resolvedTab}`}
      >
        {resolvedTab === "result" && (
          <ResultBody
            payload={payload}
            exportEnabled={exportEnabled}
            onExport={onExport}
            onSaveRows={onSaveRows}
          />
        )}
        {resolvedTab === "sql" && <SqlBody payload={payload} />}
        {resolvedTab === "plan" && <PlanBody payload={payload} />}
        {resolvedTab === "messages" && <MessagesBody payload={payload} />}
      </div>
    </section>
  );
}

function ResultBody({
  payload,
  exportEnabled,
  onExport,
  onSaveRows,
}: {
  payload: EvaluationJsonPayload;
  exportEnabled: boolean;
  onExport: (format: "csv" | "json") => void;
  onSaveRows?: (rows: Array<Record<string, string>>) => Promise<void>;
}) {
  const view = resolveResultView(payload);

  switch (view) {
    case "pending":
      return (
        <div className="welcome-state">
          <p className="muted">{payload.value ?? "Run a query to see results here."}</p>
        </div>
      );
    case "compare":
      return (
        <div className="stack">
          <CompareBody payload={payload} />
          {!payload.success && payload.error ? (
            <pre className="error-block">{payload.error}</pre>
          ) : null}
        </div>
      );
    case "benchmark":
      return (
        <div className="stack">
          <BenchmarkBody payload={payload} />
          {!payload.success && payload.error ? (
            <pre className="error-block">{payload.error}</pre>
          ) : null}
        </div>
      );
    case "error":
      return <pre className="error-block">{payload.error ?? "Evaluation failed."}</pre>;
    case "grid":
      return (
        <ResultRowsView
          rows={payload.rows!}
          onSave={onSaveRows}
          exportEnabled={exportEnabled}
          onExport={onExport}
        />
      );
    case "scalar":
      return (
        <ResultValueView value={payload.value!} exportEnabled={exportEnabled} onExport={onExport} />
      );
    case "empty":
      return <pre className="value-block">(null)</pre>;
  }
}

function SqlBody({ payload }: { payload: EvaluationJsonPayload }) {
  if (payload.sql.length === 0 && !payload.translatedSql) {
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
      {payload.translatedSql ? (
        <section>
          <h3>Translated SQL</h3>
          <pre>{payload.translatedSql}</pre>
        </section>
      ) : null}
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

function CompareBody({ payload }: { payload: EvaluationJsonPayload }) {
  const entries = payload.compareResults ?? [];

  if (entries.length < 2) {
    return <p className="muted">No compare results for this run.</p>;
  }

  const maxMs = Math.max(...entries.map((entry) => entry.metrics.totalMs), 1);

  return (
    <section>
      <h3>Compare</h3>
      <table className="charts-table">
      <thead>
        <tr>
          <th>Variant</th>
          <th>Total</th>
          <th>Database</th>
          <th>Rows</th>
          <th>SQL</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.index}>
            <td>{entry.label}</td>
            <td>{entry.metrics.totalMs} ms</td>
            <td>{entry.metrics.databaseMs ?? "—"} ms</td>
            <td>{entry.metrics.rowCount ?? "—"}</td>
            <td>{entry.metrics.sqlCommandCount}</td>
            <td>{entry.success ? "ok" : entry.error ?? "failed"}</td>
            <td>
              <div
                className="chart-bar"
                style={{ width: `${Math.max(4, (entry.metrics.totalMs / maxMs) * 100)}%` }}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </section>
  );
}

function BenchmarkBody({ payload }: { payload: EvaluationJsonPayload }) {
  const benchmark = payload.benchmarkResult;

  if (!benchmark || benchmark.samples.length === 0) {
    return <p className="muted">No benchmark results for this run.</p>;
  }

  const maxMs = Math.max(...benchmark.samples.map((sample) => sample.totalMs), 1);

  return (
    <section>
      <h3>Benchmark ({benchmark.iterations} runs)</h3>
      <p className="muted">
        Avg {benchmark.averageMs} ms · min {benchmark.minMs} ms · max {benchmark.maxMs} ms · p95{" "}
        {benchmark.p95Ms} ms
      </p>
      <table className="charts-table">
        <thead>
          <tr>
            <th>Run</th>
            <th>Total</th>
            <th>Database</th>
            <th>Rows</th>
            <th>Commands</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {benchmark.samples.map((sample) => (
            <tr key={sample.iteration}>
              <td>{sample.iteration}</td>
              <td>{sample.totalMs} ms</td>
              <td>{sample.databaseMs ?? "—"} ms</td>
              <td>{sample.rowCount ?? "—"}</td>
              <td>{sample.sqlCommandCount}</td>
              <td>{sample.success ? "ok" : sample.error ?? "failed"}</td>
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
  );
}
