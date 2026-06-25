import type { DbInfoJsonPayload } from "../types/schema";

interface DbInfoDialogProps {
  open: boolean;
  connectionName: string;
  loading: boolean;
  error?: string;
  payload?: DbInfoJsonPayload;
  onClose: () => void;
}

export function DbInfoDialog({
  open,
  connectionName,
  loading,
  error,
  payload,
  onClose,
}: DbInfoDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="charts-overlay" onClick={onClose}>
      <section className="db-info-dialog" onClick={(event) => event.stopPropagation()}>
        <header className="charts-header">
          <h2>DB Info</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <p className="muted db-info-subtitle">{connectionName}</p>

        {loading ? <p className="muted">Loading database info…</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {payload ? (
          <>
            <p className="db-info-context">
              <span className="muted">DbContext</span> {payload.dbContext}
            </p>
            <div className="table-wrap db-info-table-wrap">
              <table className="db-info-table">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.entries.map((entry) => (
                    <tr key={entry.key}>
                      <th scope="row">{entry.key}</th>
                      <td title={entry.value ?? ""}>{entry.value ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
