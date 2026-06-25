import type { BenchmarkResult } from "../lib/benchmark";
import type { EvaluationHistoryEntry } from "../lib/history";
import { BUILTIN_SNIPPETS } from "../types/snippets";
import type { QueryTab } from "../types/query";
import type { SnippetDefinition } from "../types/snippets";
import type { EditorToolId } from "./EditorToolRail";

interface EditorToolPanelProps {
  tool: EditorToolId;
  history: EvaluationHistoryEntry[];
  baseline?: EvaluationHistoryEntry;
  benchmark?: BenchmarkResult;
  userSnippets: SnippetDefinition[];
  favoriteTabs: QueryTab[];
  onClose: () => void;
  onHistorySelect: (expression: string) => void;
  onInsertSnippet: (expression: string) => void;
  onAddSnippet: (title: string, expression: string) => void;
  onRemoveSnippet: (id: string) => void;
  onOpenFavorite: (tab: QueryTab) => void;
  onToggleFavorite: (tabId: string) => void;
}

const TOOL_TITLES: Record<EditorToolId, string> = {
  charts: "Charts",
  history: "History",
  snippets: "Snippets",
  favorites: "Favorites",
};

export function EditorToolPanel({
  tool,
  history,
  baseline,
  benchmark,
  userSnippets,
  favoriteTabs,
  onClose,
  onHistorySelect,
  onInsertSnippet,
  onAddSnippet,
  onRemoveSnippet,
  onOpenFavorite,
  onToggleFavorite,
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
          <ChartsToolView history={history} baseline={baseline} benchmark={benchmark} />
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
      </div>
    </aside>
  );
}

function ChartsToolView({
  history,
  baseline,
  benchmark,
}: {
  history: EvaluationHistoryEntry[];
  baseline?: EvaluationHistoryEntry;
  benchmark?: BenchmarkResult;
}) {
  const latest = history[0];
  const maxMs = Math.max(...history.map((entry) => entry.totalMs), benchmark?.maxMs ?? 0, 1);

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

      <section className="tool-panel-section">
        <h3>Compare baseline</h3>
        {baseline && latest ? (
          <table className="charts-table">
            <tbody>
              <tr>
                <th>Total</th>
                <td>{baseline.totalMs} ms</td>
                <td>{latest.totalMs} ms</td>
              </tr>
              <tr>
                <th>Rows</th>
                <td>{baseline.rowCount ?? "—"}</td>
                <td>{latest.rowCount ?? "—"}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p className="muted">Set a compare baseline from the run bar.</p>
        )}
      </section>

      {benchmark ? (
        <section className="tool-panel-section">
          <h3>Benchmark ({benchmark.iterations} runs)</h3>
          <p className="muted">
            Avg {benchmark.averageMs} ms · min {benchmark.minMs} ms · max {benchmark.maxMs} ms
          </p>
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

function truncate(value: string, max: number): string {
  const trimmed = value.trim().replace(/\s+/gu, " ");
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}
