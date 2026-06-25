import { useEffect, useState } from "react";
import { fetchLiveSqlPreview } from "../lib/liveSql";
import type { ConnectionSettings } from "../types/connection";

interface LiveSqlPaneProps {
  expression: string;
  connectionSettings: ConnectionSettings | undefined;
  searchDirectory: string;
  enabled: boolean;
  onConvertSql?: (sql: string) => void;
}

export function LiveSqlPane({
  expression,
  connectionSettings,
  searchDirectory,
  enabled,
  onConvertSql,
}: LiveSqlPaneProps) {
  const [sql, setSql] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !connectionSettings || !searchDirectory.trim()) {
      setSql("");
      setError("");
      return;
    }

    const handle = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
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
          setLoading(false);
        }
      })();
    }, 600);

    return () => window.clearTimeout(handle);
  }, [enabled, connectionSettings, searchDirectory, expression]);

  return (
    <section className="live-sql-pane">
      <div className="live-sql-header">
        <h3>Live SQL</h3>
        <span className="muted">{loading ? "Translating…" : "ToQueryString preview"}</span>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <pre className="live-sql-body">{sql || (enabled ? "Type a LINQ expression to preview SQL." : "Live SQL preview is off.")}</pre>
      {onConvertSql && sql ? (
        <div className="live-sql-actions">
          <button type="button" onClick={() => onConvertSql(sql)}>
            Convert SQL → LINQ
          </button>
        </div>
      ) : null}
    </section>
  );
}
