import { useEffect, useState } from "react";
import {
  buildDbSetCountExpression,
  buildDbSetSampleExpression,
  fetchDescribeJson,
  fetchTablesJson,
} from "../lib/schema";
import type { ConnectionSettings } from "../types/connection";
import type { DescribeJsonPayload, TablesJsonEntry, TablesJsonPayload } from "../types/schema";

interface SchemaExplorerProps {
  connectionSettings: ConnectionSettings | undefined;
  searchDirectory: string;
  onRunExpression: (expression: string) => void;
}

export function SchemaExplorer({
  connectionSettings,
  searchDirectory,
  onRunExpression,
}: SchemaExplorerProps) {
  const [tables, setTables] = useState<TablesJsonPayload | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [selectedDbSet, setSelectedDbSet] = useState<string | undefined>();
  const [describe, setDescribe] = useState<DescribeJsonPayload | undefined>();

  useEffect(() => {
    if (!connectionSettings || !searchDirectory) {
      setTables(undefined);
      setError("Set a search directory or EF project to load the model.");
      return;
    }

    void (async () => {
      setLoading(true);
      setError(undefined);
      try {
        const payload = await fetchTablesJson(connectionSettings, searchDirectory, searchDirectory);
        if (!payload) {
          setTables(undefined);
          setError("Could not load DbSets from efvibe.");
          return;
        }
        setTables(payload);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      } finally {
        setLoading(false);
      }
    })();
  }, [connectionSettings, searchDirectory]);

  useEffect(() => {
    if (!selectedDbSet || !connectionSettings || !searchDirectory) {
      setDescribe(undefined);
      return;
    }

    void (async () => {
      try {
        const payload = await fetchDescribeJson(
          connectionSettings,
          searchDirectory,
          searchDirectory,
          selectedDbSet,
        );
        setDescribe(payload);
      } catch {
        setDescribe(undefined);
      }
    })();
  }, [selectedDbSet, connectionSettings, searchDirectory]);

  function renderDbSet(entry: TablesJsonEntry) {
    const active = entry.dbSet === selectedDbSet;
    return (
      <li key={entry.dbSet} className="schema-dbset">
        <button
          type="button"
          className={active ? "schema-dbset-btn active" : "schema-dbset-btn"}
          onClick={() => setSelectedDbSet(entry.dbSet)}
        >
          <strong>{entry.dbSet}</strong>
          <small>{entry.entityType}</small>
        </button>
        <div className="schema-actions">
          <button type="button" onClick={() => onRunExpression(buildDbSetCountExpression(entry.dbSet))}>
            Count
          </button>
          <button type="button" onClick={() => onRunExpression(buildDbSetSampleExpression(entry.dbSet))}>
            Sample
          </button>
          <button type="button" onClick={() => setSelectedDbSet(entry.dbSet)}>
            Describe
          </button>
        </div>
      </li>
    );
  }

  return (
    <section className="sidebar-panel schema-panel">
      <div className="sidebar-header">
        <h3>Schema</h3>
        <span className="muted">{tables?.dbContext ?? ""}</span>
      </div>
      {loading && <p className="muted">Loading DbSets…</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && tables && (
        <ul className="schema-list">{tables.tables.map(renderDbSet)}</ul>
      )}
      {describe?.members && describe.members.length > 0 && (
        <div className="describe-panel">
          <h4>{describe.dbSet ?? selectedDbSet}</h4>
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Type</th>
                <th>Nullable</th>
              </tr>
            </thead>
            <tbody>
              {describe.members.map((member) => (
                <tr key={member.name}>
                  <td>{member.name}</td>
                  <td>{member.type}</td>
                  <td>{member.nullable}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
