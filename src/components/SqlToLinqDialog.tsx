import { useEffect, useState } from "react";
import { convertSqlToLinqDraft } from "../lib/sqlToLinq";

interface SqlToLinqDialogProps {
  open: boolean;
  initialSql?: string;
  onClose: () => void;
  onInsert: (linq: string) => void;
}

export function SqlToLinqDialog({ open, initialSql = "", onClose, onInsert }: SqlToLinqDialogProps) {
  const [sql, setSql] = useState(initialSql);

  useEffect(() => {
    if (open) {
      setSql(initialSql);
    }
  }, [open, initialSql]);

  if (!open) {
    return null;
  }

  const result = convertSqlToLinqDraft(sql);

  return (
    <div className="charts-overlay" onClick={onClose}>
      <section className="sql-to-linq-dialog" onClick={(event) => event.stopPropagation()}>
        <header className="charts-header">
          <h2>SQL → LINQ draft</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <p className="muted">
          Draft assistant for simple SELECT queries. Always review and validate with Run or live SQL preview.
        </p>

        <label className="field-label">
          SQL input
          <textarea value={sql} onChange={(event) => setSql(event.target.value)} rows={8} />
        </label>

        <div className={`confidence-badge confidence-${result.confidence}`}>
          Confidence: {result.confidence}
        </div>

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

        <div className="dialog-actions">
          <button type="button" onClick={() => onInsert(result.linq)}>
            Insert into editor
          </button>
        </div>
      </section>
    </div>
  );
}
