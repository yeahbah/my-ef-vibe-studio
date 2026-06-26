import { useEffect, useState } from "react";
import type { EvaluationHistoryEntry } from "../lib/history";
import { formatFindingSummary, scanCodeToRunnableExpression } from "../lib/scan";
import { BUILTIN_SNIPPETS } from "../types/snippets";
import type { QueryTab } from "../types/query";
import type { SnippetDefinition } from "../types/snippets";
import type { ScanMode, ScanReviewItem } from "../types/scan";
import type { AppTheme } from "../types/theme";
import type { EditorToolId } from "./EditorToolRail";
import { ReadOnlyCodeView } from "./ReadOnlyCodeView";

interface EditorToolPanelProps {
  tool: EditorToolId;
  history: EvaluationHistoryEntry[];
  compareBaseline?: EvaluationHistoryEntry;
  benchmark?: import("../lib/benchmark").BenchmarkResult;
  userSnippets: SnippetDefinition[];
  favoriteTabs: QueryTab[];
  scanItems: ScanReviewItem[];
  scanIndex: number;
  scanLoading: boolean;
  scanError?: string;
  theme: AppTheme;
  onClose: () => void;
  onHistorySelect: (expression: string) => void;
  onInsertSnippet: (expression: string) => void;
  onAddSnippet: (title: string, expression: string) => void;
  onRemoveSnippet: (id: string) => void;
  onOpenFavorite: (tab: QueryTab) => void;
  onToggleFavorite: (tabId: string) => void;
  onRunScan: (mode: ScanMode) => void;
  onScanIndexChange: (index: number) => void;
  onGoToSource: (file: string, line: number) => void;
  onRunQuery: (expression: string) => void;
  onDismissFinding: (note?: string) => void;
  onSaveFindingNote: (note: string) => void;
  running?: boolean;
}

const TOOL_TITLES: Record<EditorToolId, string> = {
  charts: "Charts",
  history: "History",
  snippets: "Snippets",
  favorites: "Favorites",
  scan: "Scan",
};

export function EditorToolPanel({
  tool,
  history,
  compareBaseline,
  benchmark,
  userSnippets,
  favoriteTabs,
  scanItems,
  scanIndex,
  scanLoading,
  scanError,
  theme,
  onClose,
  onHistorySelect,
  onInsertSnippet,
  onAddSnippet,
  onRemoveSnippet,
  onOpenFavorite,
  onToggleFavorite,
  onRunScan,
  onScanIndexChange,
  onGoToSource,
  onRunQuery,
  onDismissFinding,
  onSaveFindingNote,
  running = false,
}: EditorToolPanelProps) {
  return (
    <aside className="editor-tool-panel" aria-label={TOOL_TITLES[tool]}>
      <header className="editor-tool-panel-header">
        <h2>{TOOL_TITLES[tool]}</h2>
        <button type="button" className="editor-tool-panel-close" onClick={onClose} aria-label="Close panel">
          ×
        </button>
      </header>

      <div className="editor-tool-panel-body">
        {tool === "charts" ? (
          <ChartsToolView history={history} compareBaseline={compareBaseline} benchmark={benchmark} />
        ) : null}

        {tool === "history" ? (
          <HistoryToolView history={history} onSelect={onHistorySelect} />
        ) : null}

        {tool === "snippets" ? (
          <SnippetsToolView
            userSnippets={userSnippets}
            onInsert={onInsertSnippet}
            onAdd={onAddSnippet}
            onRemove={onRemoveSnippet}
          />
        ) : null}

        {tool === "favorites" ? (
          <FavoritesToolView
            tabs={favoriteTabs}
            onOpen={onOpenFavorite}
            onToggleFavorite={onToggleFavorite}
          />
        ) : null}

        {tool === "scan" ? (
          <ScanToolView
            items={scanItems}
            index={scanIndex}
            loading={scanLoading}
            error={scanError}
            theme={theme}
            onRunScan={onRunScan}
            onIndexChange={onScanIndexChange}
            onGoToSource={onGoToSource}
            onRunQuery={onRunQuery}
            onDismissFinding={onDismissFinding}
            onSaveFindingNote={onSaveFindingNote}
            running={running}
          />
        ) : null}
      </div>
    </aside>
  );
}

function ChartsToolView({
  history,
  compareBaseline,
  benchmark,
}: {
  history: EvaluationHistoryEntry[];
  compareBaseline?: EvaluationHistoryEntry;
  benchmark?: import("../lib/benchmark").BenchmarkResult;
}) {
  const latest = history[0];
  const maxMs = Math.max(...history.map((entry) => entry.totalMs), benchmark?.maxMs ?? 0, 1);
  const appMs =
    latest && latest.databaseMs !== undefined
      ? Math.max(0, latest.totalMs - latest.databaseMs)
      : undefined;

  return (
    <div className="tool-panel-sections">
      <section className="tool-panel-section">
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
                <th />
              </tr>
            </thead>
            <tbody>
              {history.slice(0, 12).map((entry, index) => (
                <tr key={entry.id}>
                  <td>{index + 1}</td>
                  <td>
                    <code>{truncate(entry.expression, 48)}</code>
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

      {latest ? (
        <section className="tool-panel-section">
          <h3>Last run timing</h3>
          <table className="charts-table">
            <tbody>
              <tr>
                <td>Total</td>
                <td>{latest.totalMs} ms</td>
                <td>
                  <div
                    className="chart-bar"
                    style={{ width: `${Math.max(4, (latest.totalMs / maxMs) * 100)}%` }}
                  />
                </td>
              </tr>
              <tr>
                <td>Database</td>
                <td>{latest.databaseMs ?? "—"} ms</td>
                <td>
                  {latest.databaseMs !== undefined ? (
                    <div
                      className="chart-bar chart-bar-database"
                      style={{ width: `${Math.max(4, (latest.databaseMs / maxMs) * 100)}%` }}
                    />
                  ) : null}
                </td>
              </tr>
              <tr>
                <td>App / Roslyn</td>
                <td>{appMs ?? "—"} ms</td>
                <td>
                  {appMs !== undefined ? (
                    <div
                      className="chart-bar chart-bar-app"
                      style={{ width: `${Math.max(4, (appMs / maxMs) * 100)}%` }}
                    />
                  ) : null}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="tool-panel-section">
        <h3>Compare baseline</h3>
        {compareBaseline && latest ? (
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
                <td>{compareBaseline.totalMs} ms</td>
                <td>{latest.totalMs} ms</td>
              </tr>
              <tr>
                <td>Database</td>
                <td>{compareBaseline.databaseMs ?? "—"} ms</td>
                <td>{latest.databaseMs ?? "—"} ms</td>
              </tr>
              <tr>
                <td>Rows</td>
                <td>{compareBaseline.rowCount ?? "—"}</td>
                <td>{latest.rowCount ?? "—"}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p className="muted">Use Set baseline in the run bar, then run another query.</p>
        )}
      </section>

      {benchmark ? (
        <section className="tool-panel-section">
          <h3>Benchmark ({benchmark.iterations} runs)</h3>
          <p className="muted">
            Avg {benchmark.averageMs} ms · min {benchmark.minMs} ms · max {benchmark.maxMs} ms
          </p>
          <table className="charts-table">
            <thead>
              <tr>
                <th>Run</th>
                <th>Total</th>
                <th />
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
    </div>
  );
}

function HistoryToolView({
  history,
  onSelect,
}: {
  history: EvaluationHistoryEntry[];
  onSelect: (expression: string) => void;
}) {
  if (history.length === 0) {
    return <p className="muted tool-panel-empty">Run a query to build history.</p>;
  }

  return (
    <ul className="tool-item-list">
      {history.map((entry) => (
        <li key={entry.id}>
          <button type="button" className="tool-list-item" onClick={() => onSelect(entry.expression)}>
            <span className="tool-list-item-title">{truncate(entry.expression, 56)}</span>
            <span className="tool-list-item-meta">
              {entry.totalMs} ms · {entry.connectionName}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function SnippetsToolView({
  userSnippets,
  onInsert,
  onAdd,
  onRemove,
}: {
  userSnippets: SnippetDefinition[];
  onInsert: (expression: string) => void;
  onAdd: (title: string, expression: string) => void;
  onRemove: (id: string) => void;
}) {
  const snippets = [...BUILTIN_SNIPPETS, ...userSnippets];

  function handleAddSnippet() {
    const title = window.prompt("Snippet title");
    if (!title?.trim()) {
      return;
    }

    const expression = window.prompt("Snippet expression");
    if (expression?.trim()) {
      onAdd(title.trim(), expression.trim());
    }
  }

  return (
    <>
      <div className="tool-panel-actions">
        <button type="button" onClick={handleAddSnippet}>
          Add snippet…
        </button>
      </div>
      <ul className="tool-item-list">
        {snippets.map((snippet) => {
          const custom = userSnippets.some((entry) => entry.id === snippet.id);
          return (
            <li key={snippet.id} className="tool-list-item-row">
              <button type="button" className="tool-list-item" onClick={() => onInsert(snippet.expression)}>
                <span className="tool-list-item-title">{snippet.title}</span>
                <span className="tool-list-item-meta">
                  {snippet.builtin ? "built-in" : "custom"} · {truncate(snippet.expression, 42)}
                </span>
              </button>
              {custom ? (
                <button
                  type="button"
                  className="tool-list-item-remove"
                  aria-label={`Remove ${snippet.title}`}
                  onClick={() => onRemove(snippet.id)}
                >
                  ×
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function FavoritesToolView({
  tabs,
  onOpen,
  onToggleFavorite,
}: {
  tabs: QueryTab[];
  onOpen: (tab: QueryTab) => void;
  onToggleFavorite: (tabId: string) => void;
}) {
  if (tabs.length === 0) {
    return <p className="muted tool-panel-empty">Star a query tab to add it here.</p>;
  }

  return (
    <ul className="tool-item-list">
      {tabs.map((tab) => (
        <li key={tab.id} className="tool-list-item-row">
          <button type="button" className="tool-list-item" onClick={() => onOpen(tab)}>
            <span className="tool-list-item-title">{tab.name}</span>
            <span className="tool-list-item-meta">{truncate(tab.expression, 48) || "Empty query"}</span>
          </button>
          <button
            type="button"
            className="tool-list-item-remove active"
            aria-label={`Unfavorite ${tab.name}`}
            onClick={() => onToggleFavorite(tab.id)}
          >
            ★
          </button>
        </li>
      ))}
    </ul>
  );
}

function ScanToolView({
  items,
  index,
  loading,
  error,
  theme,
  onRunScan,
  onIndexChange,
  onGoToSource,
  onRunQuery,
  onDismissFinding,
  onSaveFindingNote,
  running = false,
}: {
  items: ScanReviewItem[];
  index: number;
  loading: boolean;
  error?: string;
  theme: AppTheme;
  onRunScan: (mode: ScanMode) => void;
  onIndexChange: (index: number) => void;
  onGoToSource: (file: string, line: number) => void;
  onRunQuery: (expression: string) => void;
  onDismissFinding: (note?: string) => void;
  onSaveFindingNote: (note: string) => void;
  running?: boolean;
}) {
  const activeFinding = items[index];
  const [noteDraft, setNoteDraft] = useState("");
  const runnableExpression = activeFinding
    ? scanCodeToRunnableExpression(activeFinding.finding.code)
    : "";

  useEffect(() => {
    setNoteDraft(activeFinding?.finding.savedNote ?? "");
  }, [activeFinding?.key, activeFinding?.finding.savedNote]);

  function handleSaveNote() {
    if (!noteDraft.trim()) {
      return;
    }

    onSaveFindingNote(noteDraft);
  }

  function handleDismiss() {
    onDismissFinding(noteDraft.trim() || undefined);
  }

  return (
    <>
      <div className="tool-panel-actions scan-actions">
        <button type="button" disabled={loading} onClick={() => onRunScan("lite")}>
          Run lite scan
        </button>
        <button type="button" disabled={loading} onClick={() => onRunScan("deep")}>
          Run deep scan
        </button>
      </div>

      {loading ? <p className="muted tool-panel-empty">Scanning…</p> : null}
      {error ? <p className="error-text tool-panel-empty">{error}</p> : null}

      {!loading && items.length === 0 && !error ? (
        <p className="muted tool-panel-empty">Run a scan to review findings.</p>
      ) : null}

      {activeFinding ? (
        <section className="tool-panel-section scan-review">
          <div className="scan-queue-toolbar">
            <button type="button" disabled={index <= 0} onClick={() => onIndexChange(index - 1)}>
              ← Previous
            </button>
            <button
              type="button"
              disabled={index >= items.length - 1}
              onClick={() => onIndexChange(index + 1)}
            >
              Next →
            </button>
            <span className="scan-queue-counter muted">
              {index + 1} / {items.length}
            </span>
            <button
              type="button"
              disabled={running || !runnableExpression}
              onClick={() => onRunQuery(runnableExpression)}
            >
              Run query
            </button>
            <button
              type="button"
              onClick={() => onGoToSource(activeFinding.finding.filePath, activeFinding.finding.line)}
            >
              Go to code
            </button>
          </div>
          <p className="tool-list-item-meta">
            {activeFinding.finding.filePath}:{activeFinding.finding.line}
          </p>
          <p className="tool-list-item-title">{formatFindingSummary(activeFinding.finding)}</p>
          {activeFinding.finding.recommendation ? (
            <p className="scan-recommendation muted">{activeFinding.finding.recommendation}</p>
          ) : null}
          <ReadOnlyCodeView code={activeFinding.finding.code} theme={theme} />
          <label className="scan-note-field">
            <span className="scan-note-label">Note</span>
            <textarea
              className="scan-note-input"
              value={noteDraft}
              placeholder="Team note for this finding (saved to myefvibe-scan-notes.json)"
              onChange={(event) => setNoteDraft(event.target.value)}
            />
            <div className="scan-note-actions">
              <button type="button" disabled={!noteDraft.trim()} onClick={handleSaveNote}>
                Save note
              </button>
              <button type="button" className="scan-dismiss-btn" onClick={handleDismiss}>
                Dismiss
              </button>
            </div>
          </label>
          <p className="scan-queue-hint muted">
            Dismiss hides this finding on the next scan when respect dismissals is enabled.
          </p>
        </section>
      ) : null}
    </>
  );
}

function truncate(value: string, max: number): string {
  const trimmed = value.trim().replace(/\s+/gu, " ");
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}
