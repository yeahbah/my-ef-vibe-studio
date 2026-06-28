import type { DescribeJsonPayload } from "../types/schema";
import { useEscapeClose } from "../lib/useEscapeClose";

interface DbSetPropertiesDialogProps {
  open: boolean;
  dbSet: string;
  connectionName: string;
  loading: boolean;
  error?: string;
  payload?: DescribeJsonPayload;
  onClose: () => void;
}

export function DbSetPropertiesDialog({
  open,
  dbSet,
  connectionName,
  loading,
  error,
  payload,
  onClose,
}: DbSetPropertiesDialogProps) {
  useEscapeClose(open, onClose);

  if (!open) {
    return null;
  }

  return (
    <div className="charts-overlay" onClick={onClose}>
      <section className="db-set-properties-dialog" onClick={(event) => event.stopPropagation()}>
        <header className="charts-header">
          <h2>Properties</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <p className="muted db-info-subtitle">
          {dbSet} · {connectionName}
        </p>

        {loading ? <p className="muted">Loading table properties…</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {payload ? (
          <>
            {payload.entityType ? (
              <p className="db-info-context">
                <span className="muted">Entity type</span> {payload.entityType}
              </p>
            ) : null}
            {payload.entityTypeFullName ? (
              <p className="db-info-context">
                <span className="muted">Full name</span> {payload.entityTypeFullName}
              </p>
            ) : null}
            {payload.error ? <p className="error-text">{payload.error}</p> : null}
            {payload.members?.length ? (
              <div className="table-wrap db-info-table-wrap">
                <table className="db-info-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Nullable</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.members.map((member) => (
                      <tr key={member.name}>
                        <th scope="row">{member.name}</th>
                        <td>{member.type}</td>
                        <td>{member.nullable}</td>
                        <td title={member.notes ?? ""}>{member.notes ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : !payload.error ? (
              <p className="muted">No members returned for this table.</p>
            ) : null}
            {payload.knownEntities?.length ? (
              <p className="db-info-context">
                <span className="muted">Known entities</span> {payload.knownEntities.join(", ")}
              </p>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}
