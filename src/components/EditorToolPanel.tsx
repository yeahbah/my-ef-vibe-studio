import { useEffect, useRef, useState } from "react";
import {
  filterQueryHistory,
  groupHistoryByDate,
  type EvaluationHistoryEntry,
} from "../lib/history";
import { REMOTE_SNIPPET_PACK_REGISTRY } from "../lib/packRegistry";
import { formatFindingSummary, scanCodeToRunnableExpression } from "../lib/scan";
import { BUILTIN_SNIPPETS } from "../types/snippets";
import { BUILTIN_SNIPPET_PACKS } from "../types/snippetPacks";
import { InstallPackUrlDialog } from "./InstallPackUrlDialog";
import type { QueryTab } from "../types/query";
import type { SnippetDefinition } from "../types/snippets";
import type { ScanMode, ScanReviewItem } from "../types/scan";
import type { AppTheme } from "../types/theme";
import type { EditorToolId } from "./EditorToolRail";
import { ReadOnlyCodeView } from "./ReadOnlyCodeView";
import { ScriptsToolView } from "./ScriptsToolView";

interface EditorToolPanelProps {
  tool: EditorToolId;
  history: EvaluationHistoryEntry[];
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
  installedPackIds: string[];
  onInstallBuiltinPack: (packId: string) => void;
  onInstallRemotePack: (packId: string) => void;
  onInstallPackFromUrl: (url: string) => Promise<void>;
  onOpenFavorite: (tab: QueryTab) => void;
  onToggleFavorite: (tabId: string) => void;
  onRunScan: (mode: ScanMode) => void;
  onScanIndexChange: (index: number) => void;
  onOpenSourceTab: (file: string, line: number) => void;
  onGoToSource: (file: string, line: number) => void;
  onRunQuery: (expression: string) => void;
  onDismissFinding: (note?: string) => void;
  onSaveFindingNote: (note: string) => void;
  running?: boolean;
  scriptSearchPath?: string;
  scriptLoads?: string[];
  scriptUsings?: string[];
  onScriptsChanged?: () => void;
  onScriptCreated?: (fileName: string) => void;
  onScriptLoadsChange?: (scriptLoads: string[]) => void;
  onScriptUsingsChange?: (scriptUsings: string[]) => void;
}

const TOOL_TITLES: Record<EditorToolId, string> = {
  charts: "Charts",
  history: "History",
  snippets: "Snippets",
  scripts: "Scripts",
  favorites: "Favorites",
  scan: "Scan",
};

export function EditorToolPanel({
  tool,
  history,
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
  installedPackIds,
  onInstallBuiltinPack,
  onInstallRemotePack,
  onInstallPackFromUrl,
  onOpenFavorite,
  onToggleFavorite,
  onRunScan,
  onScanIndexChange,
  onOpenSourceTab,
  onGoToSource,
  onRunQuery,
  onDismissFinding,
  onSaveFindingNote,
  running = false,
  scriptSearchPath = "",
  scriptLoads = [],
  scriptUsings = [],
  onScriptsChanged,
  onScriptCreated,
  onScriptLoadsChange,
  onScriptUsingsChange,
}: EditorToolPanelProps) {
  return (
    <aside className="editor-tool-panel" aria-label={TOOL_TITLES[tool]}>
      <header className="editor-tool-panel-header">
        <h2>{TOOL_TITLES[tool]}</h2>
        <button type="button" className="editor-tool-panel-close" onClick={onClose} aria-label="Close panel">
          ×
        </button>
      </header>

      <div className={`editor-tool-panel-body${tool === "scripts" ? " editor-tool-panel-body-fill" : ""}`}>
        {tool === "charts" ? (
          <ChartsToolView history={history} />
        ) : null}

        {tool === "history" ? (
          <HistoryToolView history={history} onSelect={onHistorySelect} />
        ) : null}

        {tool === "snippets" ? (
          <SnippetsToolView
            userSnippets={userSnippets}
            installedPackIds={installedPackIds}
            onInsert={onInsertSnippet}
            onAdd={onAddSnippet}
            onRemove={onRemoveSnippet}
            onInstallBuiltinPack={onInstallBuiltinPack}
            onInstallRemotePack={onInstallRemotePack}
            onInstallPackFromUrl={onInstallPackFromUrl}
          />
        ) : null}

        {tool === "scripts" ? (
          <ScriptsToolView
            scriptSearchPath={scriptSearchPath}
            scriptLoads={scriptLoads}
            scriptUsings={scriptUsings}
            theme={theme}
            onScriptsChanged={onScriptsChanged}
            onScriptCreated={onScriptCreated}
            onScriptLoadsChange={onScriptLoadsChange}
            onScriptUsingsChange={onScriptUsingsChange}
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
            onOpenSourceTab={onOpenSourceTab}
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

function ChartsToolView({ history }: { history: EvaluationHistoryEntry[] }) {
  const chartHistory = filterQueryHistory(history);
  const latest = chartHistory[0];
  const maxMs = Math.max(...chartHistory.map((entry) => entry.totalMs), 1);
  const appMs =
    latest && latest.databaseMs !== undefined
      ? Math.max(0, latest.totalMs - latest.databaseMs)
      : undefined;

  return (
    <div className="tool-panel-sections">
      <section className="tool-panel-section">
        <h3>Recent timings</h3>
        {chartHistory.length === 0 ? (
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
              {chartHistory.slice(0, 12).map((entry, index) => (
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
  const groups = groupHistoryByDate(history);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const defaultExpandedRef = useRef(false);

  useEffect(() => {
    if (defaultExpandedRef.current) {
      return;
    }

    const todayGroup = groups.find((group) => group.label === "Today");
    if (!todayGroup) {
      return;
    }

    defaultExpandedRef.current = true;
    setExpandedKeys(new Set([todayGroup.dateKey]));
  }, [groups]);

  function togglePanel(dateKey: string) {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  }

  if (history.length === 0) {
    return <p className="muted tool-panel-empty">Run a query to build history.</p>;
  }

  if (groups.length === 0) {
    return <p className="muted tool-panel-empty">No queries in the last 7 days.</p>;
  }

  return (
    <div className="history-expansion-panels">
      {groups.map((group) => {
        const expanded = expandedKeys.has(group.dateKey);

        return (
          <section
            key={group.dateKey}
            className={`history-expansion-panel ${expanded ? "expanded" : "collapsed"}`}
          >
            <button
              type="button"
              className="history-expansion-header"
              aria-expanded={expanded}
              onClick={() => togglePanel(group.dateKey)}
            >
              <span className="history-expansion-chevron" aria-hidden="true">
                {expanded ? "▾" : "▸"}
              </span>
              <span className="history-expansion-title">{group.label}</span>
              <span className="history-expansion-count">{group.entries.length}</span>
            </button>
            {expanded ? (
              <ul className="tool-item-list history-expansion-body">
                {group.entries.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className="tool-list-item"
                      onClick={() => onSelect(entry.expression)}
                    >
                      <span className="tool-list-item-title">{truncate(entry.expression, 56)}</span>
                      <span className="tool-list-item-meta">
                        {entry.totalMs} ms · {entry.connectionName}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function SnippetsToolView({
  userSnippets,
  installedPackIds,
  onInsert,
  onAdd,
  onRemove,
  onInstallBuiltinPack,
  onInstallRemotePack,
  onInstallPackFromUrl,
}: {
  userSnippets: SnippetDefinition[];
  installedPackIds: string[];
  onInsert: (expression: string) => void;
  onAdd: (title: string, expression: string) => void;
  onRemove: (id: string) => void;
  onInstallBuiltinPack: (packId: string) => void;
  onInstallRemotePack: (packId: string) => void;
  onInstallPackFromUrl: (url: string) => Promise<void>;
}) {
  const snippets = [...BUILTIN_SNIPPETS, ...userSnippets];
  const [packUrlDialogOpen, setPackUrlDialogOpen] = useState(false);
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(
    () => new Set(["snippets"]),
  );

  function togglePanel(panelId: string) {
    setExpandedPanels((current) => {
      const next = new Set(current);
      if (next.has(panelId)) {
        next.delete(panelId);
      } else {
        next.add(panelId);
      }
      return next;
    });
  }

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

  const packEntries = [
    ...BUILTIN_SNIPPET_PACKS.map((pack) => ({
      id: pack.id,
      name: pack.name,
      description: pack.description,
      source: "built-in" as const,
      installed: installedPackIds.includes(pack.id),
      onInstall: () => onInstallBuiltinPack(pack.id),
    })),
    ...REMOTE_SNIPPET_PACK_REGISTRY.map((pack) => ({
      id: pack.id,
      name: pack.name,
      description: pack.description,
      source: "registry" as const,
      installed: installedPackIds.includes(pack.id),
      onInstall: () => onInstallRemotePack(pack.id),
    })),
  ];

  return (
    <>
      <div className="tool-panel-actions snippet-panel-actions">
        <button type="button" onClick={handleAddSnippet}>
          Add snippet…
        </button>
        <button type="button" onClick={() => setPackUrlDialogOpen(true)}>
          Install from URL…
        </button>
      </div>

      <div className="history-expansion-panels snippet-expansion-panels">
        <section
          className={`history-expansion-panel ${expandedPanels.has("snippets") ? "expanded" : "collapsed"}`}
        >
          <button
            type="button"
            className="history-expansion-header"
            aria-expanded={expandedPanels.has("snippets")}
            onClick={() => togglePanel("snippets")}
          >
            <span className="history-expansion-chevron" aria-hidden="true">
              {expandedPanels.has("snippets") ? "▾" : "▸"}
            </span>
            <span className="history-expansion-title">Snippets</span>
            <span className="history-expansion-count">{snippets.length}</span>
          </button>
          {expandedPanels.has("snippets") ? (
            <ul className="tool-item-list history-expansion-body">
              {snippets.map((snippet) => {
                const custom = userSnippets.some((entry) => entry.id === snippet.id);
                return (
                  <li key={snippet.id} className="tool-list-item-row">
                    <button
                      type="button"
                      className="tool-list-item"
                      onClick={() => onInsert(snippet.expression)}
                    >
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
          ) : null}
        </section>

        <section
          className={`history-expansion-panel ${expandedPanels.has("packs") ? "expanded" : "collapsed"}`}
        >
          <button
            type="button"
            className="history-expansion-header"
            aria-expanded={expandedPanels.has("packs")}
            onClick={() => togglePanel("packs")}
          >
            <span className="history-expansion-chevron" aria-hidden="true">
              {expandedPanels.has("packs") ? "▾" : "▸"}
            </span>
            <span className="history-expansion-title">Snippet packs</span>
            <span className="history-expansion-count">{packEntries.length}</span>
          </button>
          {expandedPanels.has("packs") ? (
            <ul className="tool-item-list history-expansion-body">
              {packEntries.map((pack) => (
                <li key={pack.id} className="snippet-pack-row">
                  <div className="snippet-pack-copy">
                    <span className="tool-list-item-title">{pack.name}</span>
                    <span className="tool-list-item-meta">
                      {pack.source} · {truncate(pack.description, 48)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`snippet-pack-install ${pack.installed ? "installed" : ""}`}
                    disabled={pack.installed}
                    onClick={pack.onInstall}
                  >
                    {pack.installed ? "Installed" : "Install"}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      <InstallPackUrlDialog
        open={packUrlDialogOpen}
        onClose={() => setPackUrlDialogOpen(false)}
        onInstall={onInstallPackFromUrl}
      />
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
  onOpenSourceTab,
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
  onOpenSourceTab: (file: string, line: number) => void;
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
              onClick={() =>
                onOpenSourceTab(activeFinding.finding.filePath, activeFinding.finding.line)
              }
            >
              Go to code
            </button>
            <button
              type="button"
              className="scan-open-ide-btn"
              onClick={() => onGoToSource(activeFinding.finding.filePath, activeFinding.finding.line)}
            >
              Open in IDE
            </button>
          </div>
          <p className="tool-list-item-meta">
            <button
              type="button"
              className="scan-location-link"
              onClick={() =>
                onOpenSourceTab(activeFinding.finding.filePath, activeFinding.finding.line)
              }
            >
              {activeFinding.finding.filePath}:{activeFinding.finding.line}
            </button>
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
