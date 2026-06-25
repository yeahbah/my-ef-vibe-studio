import { useEffect, useRef, useState } from "react";
import { resolveRunTextFromTextArea } from "../lib/editorRun";
import { fetchLiveSqlPreview } from "../lib/liveSql";
import { yieldToUi } from "../lib/yieldToUi";
import type { ConnectionSettings } from "../types/connection";

interface LiveSqlPaneProps {
  expression: string;
  connectionSettings: ConnectionSettings | undefined;
  searchDirectory: string;
  enabled: boolean;
  autoPreviewAllowed?: boolean;
  running?: boolean;
  onRequestEngine?: () => void;
  onEngineBusyChange?: (delta: number) => void;
  onConvertSql?: (sql: string) => void;
  onRunSql?: (sql: string) => void;
}

export function LiveSqlPane({
  expression,
  connectionSettings,
  searchDirectory,
  enabled,
  autoPreviewAllowed = false,
  running = false,
  onRequestEngine,
  onEngineBusyChange,
  onConvertSql,
  onRunSql,
}: LiveSqlPaneProps) {
  const [sql, setSql] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const skipInitialPreviewRef = useRef(true);

  useEffect(() => {
    if (skipInitialPreviewRef.current) {
      skipInitialPreviewRef.current = false;
      return;
    }

    if (!autoPreviewAllowed || !enabled || dirty || !connectionSettings || !searchDirectory.trim()) {
      if (!dirty) {
        if (!enabled || !connectionSettings || !searchDirectory.trim()) {
          setSql("");
          setError("");
        }
      }

      return;
    }

    const handle = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        onEngineBusyChange?.(1);
        await yieldToUi();
        try {
          const preview = await fetchLiveSqlPreview(
            connectionSettings,
            searchDirectory,
            expression,
          );
          setSql(preview.sql ?? "");
          setError(preview.error ?? "");
        } catch (previewError) {
          setSql("");
          setError(
            previewError instanceof Error ? previewError.message : String(previewError),
          );
        } finally {
          onEngineBusyChange?.(-1);
          setLoading(false);
        }
      })();
    }, 600);

    return () => window.clearTimeout(handle);
  }, [
    autoPreviewAllowed,
    connectionSettings,
    dirty,
    enabled,
    expression,
    onEngineBusyChange,
    searchDirectory,
  ]);

  async function syncFromLinq() {
    onRequestEngine?.();
    setDirty(false);

    if (!connectionSettings || !searchDirectory.trim()) {
      return;
    }

    setLoading(true);
    onEngineBusyChange?.(1);
    await yieldToUi();
    try {
      const preview = await fetchLiveSqlPreview(
        connectionSettings,
        searchDirectory,
        expression,
      );
      setSql(preview.sql ?? "");
      setError(preview.error ?? "");
    } catch (previewError) {
      setSql("");
      setError(previewError instanceof Error ? previewError.message : String(previewError));
    } finally {
      onEngineBusyChange?.(-1);
      setLoading(false);
    }
  }

  function handleRun(sqlOverride?: string) {
    const trimmed = (sqlOverride ?? sql).trim();
    if (!trimmed || !onRunSql) {
      return;
    }

    onRunSql(trimmed);
  }

  return (
    <section className="live-sql-pane">
      <div className="live-sql-header">
        <h3>SQL</h3>
        <span className="muted">
          {loading ? "Translating…" : dirty ? "Custom SQL" : "LINQ preview or raw SQL"}
        </span>
      </div>

      <textarea
        className="live-sql-editor"
        value={sql}
        spellCheck={false}
        placeholder="Preview from LINQ or type SQL to run directly."
        onChange={(event) => {
          setSql(event.target.value);
          setDirty(true);
        }}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            handleRun(resolveRunTextFromTextArea(event.currentTarget));
          }
        }}
      />

      {error && !dirty ? <p className="error-text">{error}</p> : null}

      <div className="live-sql-actions">
        {onRunSql ? (
          <button type="button" disabled={running || !sql.trim()} onClick={() => handleRun()}>
            Run SQL
          </button>
        ) : null}
        <button type="button" disabled={loading} onClick={() => void syncFromLinq()}>
          Sync from LINQ
        </button>
        {onConvertSql && sql ? (
          <button type="button" onClick={() => onConvertSql(sql)}>
            SQL → LINQ
          </button>
        ) : null}
      </div>
    </section>
  );
}
