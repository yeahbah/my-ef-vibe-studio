import { useCallback, useEffect, useMemo, useState } from "react";
import { exportErDiagramContentToFile, fetchDiagramJson } from "../lib/diagramExport";
import {
  countErDiagramEntities,
  filterErDiagramByEntity,
} from "../lib/erDiagramFilter";
import { fetchTablesJson } from "../lib/schema";
import { yieldToUi } from "../lib/yieldToUi";
import type { ConnectionSettings } from "../types/connection";
import type { TablesJsonEntry } from "../types/schema";
import type { AppTheme } from "../types/theme";
import type { WorkspaceConnection } from "../types/workspace";
import { ConnectionPicker } from "./ConnectionPicker";
import { ErDiagramViewport } from "./ErDiagramViewport";

const ALL_TABLES = "__all__";

export interface ErDiagramFocusRequest {
  dbSet?: string;
  nonce: number;
}

interface ErDiagramViewProps {
  connections: WorkspaceConnection[];
  connectionId: string;
  onConnectionChange: (connectionId: string) => void;
  connectionName: string;
  connectionSettings: ConnectionSettings;
  searchDirectory: string;
  theme: AppTheme;
  focusRequest?: ErDiagramFocusRequest;
  onStatus: (message: string) => void;
  onRequestEngine?: (connectionId?: string) => void;
  onEngineBusyChange?: (delta: number) => void;
}

export function ErDiagramView({
  connections,
  connectionId,
  onConnectionChange,
  connectionName,
  connectionSettings,
  searchDirectory,
  theme,
  focusRequest,
  onStatus,
  onRequestEngine,
  onEngineBusyChange,
}: ErDiagramViewProps) {
  const [tables, setTables] = useState<TablesJsonEntry[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [tablesError, setTablesError] = useState<string>();
  const [selectedTable, setSelectedTable] = useState(ALL_TABLES);
  const [fullDiagramContent, setFullDiagramContent] = useState<string>();
  const [diagramLoading, setDiagramLoading] = useState(false);
  const [diagramError, setDiagramError] = useState<string>();
  const [dbContextName, setDbContextName] = useState<string>();
  const [exporting, setExporting] = useState(false);

  const loadTables = useCallback(async () => {
    if (!searchDirectory) {
      setTables([]);
      setTablesError("Set search directory or EF project.");
      setTablesLoading(false);
      return;
    }

    setTablesLoading(true);
    setTablesError(undefined);
    onRequestEngine?.(connectionId);
    onEngineBusyChange?.(1);
    await yieldToUi();

    try {
      const payload = await fetchTablesJson(connectionSettings, searchDirectory, searchDirectory);

      if (!payload?.tables?.length) {
        setTables([]);
        setTablesError("No DbSet tables found for this connection.");
        return;
      }

      setTables(payload.tables);
      setSelectedTable((current) => {
        if (current === ALL_TABLES) {
          return payload.tables[0]?.dbSet ?? ALL_TABLES;
        }

        return payload.tables.some((entry) => entry.dbSet === current)
          ? current
          : payload.tables[0]?.dbSet ?? ALL_TABLES;
      });
    } catch (error) {
      setTables([]);
      setTablesError(error instanceof Error ? error.message : String(error));
    } finally {
      onEngineBusyChange?.(-1);
      setTablesLoading(false);
    }
  }, [connectionId, connectionSettings, onEngineBusyChange, onRequestEngine, searchDirectory]);

  const loadFullDiagram = useCallback(async () => {
    if (!searchDirectory) {
      setDiagramError("Set search directory or EF project.");
      setFullDiagramContent(undefined);
      return;
    }

    setDiagramLoading(true);
    setDiagramError(undefined);
    onRequestEngine?.(connectionId);
    onEngineBusyChange?.(1);
    await yieldToUi();

    try {
      const payload = await fetchDiagramJson(connectionSettings, searchDirectory, searchDirectory);

      if (!payload?.success || !payload.content) {
        setFullDiagramContent(undefined);
        setDiagramError(payload?.error ?? "Could not build ER diagram.");
        return;
      }

      setDbContextName(payload.dbContext);
      setFullDiagramContent(payload.content);
    } catch (error) {
      setFullDiagramContent(undefined);
      setDiagramError(error instanceof Error ? error.message : String(error));
    } finally {
      onEngineBusyChange?.(-1);
      setDiagramLoading(false);
    }
  }, [connectionId, connectionSettings, onEngineBusyChange, onRequestEngine, searchDirectory]);

  useEffect(() => {
    void loadTables();
  }, [loadTables]);

  useEffect(() => {
    if (tablesLoading || tables.length === 0) {
      return;
    }

    void loadFullDiagram();
  }, [loadFullDiagram, tables.length, tablesLoading]);

  useEffect(() => {
    const dbSet = focusRequest?.dbSet;

    if (!dbSet) {
      return;
    }

    if (tables.some((entry) => entry.dbSet === dbSet)) {
      setSelectedTable(dbSet);
    }
  }, [focusRequest?.dbSet, focusRequest?.nonce, tables]);

  const selectedEntry = tables.find((entry) => entry.dbSet === selectedTable);
  const totalEntityCount = useMemo(
    () => (fullDiagramContent ? countErDiagramEntities(fullDiagramContent) : 0),
    [fullDiagramContent],
  );

  const displayedDiagram = useMemo(() => {
    if (!fullDiagramContent) {
      return undefined;
    }

    if (selectedTable === ALL_TABLES || !selectedEntry) {
      return {
        content: fullDiagramContent,
        entityCount: totalEntityCount,
        relationshipCount: undefined,
      };
    }

    const filtered = filterErDiagramByEntity(fullDiagramContent, selectedEntry.entityType);

    return {
      content: filtered.content,
      entityCount: filtered.entityCount,
      relationshipCount: filtered.relationshipCount,
      focalLabel: filtered.focalLabel,
    };
  }, [fullDiagramContent, selectedEntry, selectedTable, totalEntityCount]);

  async function handleExport() {
    const content = displayedDiagram?.content;

    if (!content) {
      return;
    }

    setExporting(true);

    try {
      const suffix =
        selectedTable === ALL_TABLES
          ? "all-tables"
          : selectedTable.replace(/[^\w.-]+/gu, "-").replace(/^-+|-+$/gu, "") || "table";
      const target = await exportErDiagramContentToFile(content, `${connectionName}-${suffix}`);

      if (target) {
        onStatus(`Exported ER diagram to ${target}`);
      }
    } catch (failure) {
      onStatus(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="main-view er-diagram-view-page" aria-label="ER diagram">
      <header className="er-diagram-view-header">
        <div className="er-diagram-view-title">
          <h2>ER Diagram</h2>
          <ConnectionPicker
            connections={connections}
            activeConnectionId={connectionId}
            onChange={onConnectionChange}
            ariaLabel="Connection for ER diagram"
          />
        </div>
        <div className="er-diagram-view-actions">
          <label className="er-diagram-table-filter">
            <span className="er-diagram-control-label">Table</span>
            <select
              value={selectedTable}
              disabled={tablesLoading || tables.length === 0}
              onChange={(event) => setSelectedTable(event.target.value)}
            >
              {tables.map((entry) => (
                <option key={entry.dbSet} value={entry.dbSet}>
                  {entry.dbSet} ({entry.entityType})
                </option>
              ))}
              <option value={ALL_TABLES}>All tables</option>
            </select>
          </label>
          <button type="button" disabled={tablesLoading || diagramLoading} onClick={() => void loadTables()}>
            Refresh tables
          </button>
          <button
            type="button"
            disabled={diagramLoading || tables.length === 0}
            onClick={() => void loadFullDiagram()}
          >
            Refresh diagram
          </button>
          <button
            type="button"
            disabled={!displayedDiagram?.content || exporting}
            onClick={() => void handleExport()}
          >
            {exporting ? "Exporting…" : "Export…"}
          </button>
        </div>
      </header>

      {tablesLoading ? <p className="muted er-diagram-status">Loading tables…</p> : null}
      {tablesError ? <p className="error-text er-diagram-status">{tablesError}</p> : null}

      {diagramLoading ? <p className="muted er-diagram-status">Building ER diagram…</p> : null}
      {diagramError ? <p className="error-text er-diagram-status">{diagramError}</p> : null}

      {displayedDiagram?.content ? (
        <ErDiagramViewport
          key={`${selectedTable}:${displayedDiagram.content}`}
          source={displayedDiagram.content}
          theme={theme}
          info={{
            dbSet: selectedEntry?.dbSet,
            entityType: selectedEntry?.entityType,
            visibleCount: displayedDiagram.entityCount,
            totalCount: totalEntityCount,
            showAllTables: selectedTable === ALL_TABLES,
            dbContext: dbContextName,
          }}
        />
      ) : null}
    </section>
  );
}
