import { useEffect, useState } from "react";
import { fetchSqlToLinq } from "../lib/sqlToLinq";
import { useEscapeClose } from "../lib/useEscapeClose";
import type { ConnectionSettings } from "../types/connection";
import { EMPTY_SQL_TO_LINQ_RESULT, type SqlToLinqResult } from "../types/sqlToLinq";

interface SqlToLinqDialogProps {
  open: boolean;
  initialSql?: string;
  connectionSettings: ConnectionSettings | undefined;
  searchDirectory: string;
  onClose: () => void;
  onInsert: (linq: string) => void;
}

export function SqlToLinqDialog({
  open,
  initialSql = "",
  connectionSettings,
  searchDirectory,
  onClose,
  onInsert,
}: SqlToLinqDialogProps) {
  const [sql, setSql] = useState(initialSql);
  const [result, setResult] = useState<SqlToLinqResult>(EMPTY_SQL_TO_LINQ_RESULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setSql(initialSql);
    }
  }, [open, initialSql]);

  useEffect(() => {
    if (!open || !connectionSettings || !searchDirectory.trim() || !sql.trim()) {
      setResult(EMPTY_SQL_TO_LINQ_RESULT);
      setError("");
      return;
    }

    const handle = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError("");
        try {
          const converted = await fetchSqlToLinq(
            connectionSettings,
            searchDirectory,
            searchDirectory,
            sql,
          );
          if (!converted) {
            setResult(EMPTY_SQL_TO_LINQ_RESULT);
            setError("No SQL → LINQ payload returned from efvibe.");
            return;
          }

          setResult(converted);
        } catch (conversionError) {
          setResult(EMPTY_SQL_TO_LINQ_RESULT);
          setError(
            conversionError instanceof Error ? conversionError.message : String(conversionError),
          );
        } finally {
          setLoading(false);
        }
      })();
    }, 500);

    return () => window.clearTimeout(handle);
  }, [open, connectionSettings, searchDirectory, sql]);

  useEscapeClose(open, onClose);

  if (!open) {
    return null;
  }

  return (
    <div className="charts-overlay" onClick={onClose}>
      <section className="sql-to-linq-dialog" onClick={(event) => event.stopPropagation()}>
        <header className="charts-header">
          <h2>SQL → LINQ</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <p className="muted">
          EF-model-aware draft from efvibe with optional ToQueryString validation. Review before running.
        </p>

        <label className="field-label">
          SQL input
          <textarea value={sql} onChange={(event) => setSql(event.target.value)} rows={8} />
        </label>

        {loading ? <p className="muted">Converting…</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {result.confidence ? (
          <div className={`confidence-badge confidence-${result.confidence}`}>
            Confidence: {result.confidence}
            {result.similarity !== undefined ? ` · similarity ${Math.round(result.similarity * 100)}%` : ""}
          </div>
        ) : null}

        {result.mappings.length > 0 ? (
          <p className="muted">
            Mappings:{" "}
            {result.mappings.map((mapping) => `${mapping.table} → ${mapping.dbSet}`).join(", ")}
          </p>
        ) : null}

        {result.unsupported.length > 0 ? (
          <ul className="warnings">
            {result.unsupported.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}

        <label className="field-label">
          LINQ draft
          <textarea readOnly value={result.linq} rows={10} />
        </label>

        {result.translatedSql ? (
          <label className="field-label">
            Round-tripped SQL (ToQueryString)
            <textarea readOnly value={result.translatedSql} rows={8} />
          </label>
        ) : null}

        <div className="dialog-actions">
          <button type="button" disabled={!result.linq} onClick={() => onInsert(result.linq)}>
            Insert into editor
          </button>
        </div>
      </section>
    </div>
  );
}
