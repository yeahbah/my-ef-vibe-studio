import { useMemo, useState } from "react";
import type { QueryLibraryState } from "../types/queryLibrary";
import type { QueryTab } from "../types/query";

interface QueryLibraryPanelProps {
  library: QueryLibraryState;
  queryTabs: QueryTab[];
  onOpenQuery: (expression: string, connectionId: string, name?: string) => void;
  onToggleFavorite: (tabId: string) => void;
  onAddFolder: (name: string) => void;
  onAssignFolder: (tabId: string, folderId?: string) => void;
}

export function QueryLibraryPanel({
  library,
  queryTabs,
  onOpenQuery,
  onToggleFavorite,
  onAddFolder,
  onAssignFolder,
}: QueryLibraryPanelProps) {
  const [filter, setFilter] = useState("");
  const [folderName, setFolderName] = useState("");

  const favorites = useMemo(
    () => queryTabs.filter((tab) => tab.favorite),
    [queryTabs],
  );

  const filteredTabs = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) {
      return queryTabs;
    }

    return queryTabs.filter(
      (tab) =>
        tab.name.toLowerCase().includes(needle) ||
        tab.expression.toLowerCase().includes(needle) ||
        tab.filePath.toLowerCase().includes(needle),
    );
  }, [filter, queryTabs]);

  return (
    <section className="sidebar-panel library-panel">
      <h3>Query library</h3>
      <input
        type="search"
        placeholder="Search tabs and favorites…"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />

      <div className="library-section">
        <h4>Favorites</h4>
        {favorites.length === 0 ? (
          <p className="muted">Star a query tab to pin it here.</p>
        ) : (
          <ul className="library-list">
            {favorites.map((tab) => (
              <li key={tab.id}>
                <button
                  type="button"
                  onClick={() => onOpenQuery(tab.expression, tab.connectionId, tab.name)}
                >
                  {tab.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="library-section">
        <h4>Folders</h4>
        <div className="library-folder-add">
          <input
            type="text"
            placeholder="New folder"
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
          />
          <button
            type="button"
            disabled={!folderName.trim()}
            onClick={() => {
              onAddFolder(folderName.trim());
              setFolderName("");
            }}
          >
            Add
          </button>
        </div>
        {library.folders.map((folder) => {
          const tabs = filteredTabs.filter((tab) => tab.folderId === folder.id);
          return (
            <details key={folder.id} open>
              <summary>{folder.name}</summary>
              {tabs.length === 0 ? (
                <p className="muted">No queries in this folder.</p>
              ) : (
                <ul className="library-list">
                  {tabs.map((tab) => (
                    <li key={tab.id}>
                      <button
                        type="button"
                        onClick={() => onOpenQuery(tab.expression, tab.connectionId, tab.name)}
                      >
                        {tab.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </details>
          );
        })}
      </div>

      <div className="library-section">
        <h4>Open tabs</h4>
        <ul className="library-list">
          {filteredTabs.map((tab) => (
            <li key={tab.id} className="library-tab-row">
              <button
                type="button"
                onClick={() => onOpenQuery(tab.expression, tab.connectionId, tab.name)}
              >
                {tab.name}
              </button>
              <button
                type="button"
                className={tab.favorite ? "active" : ""}
                title={tab.favorite ? "Unfavorite" : "Favorite"}
                onClick={() => onToggleFavorite(tab.id)}
              >
                ★
              </button>
              {library.folders.length > 0 ? (
                <select
                  value={tab.folderId ?? ""}
                  onChange={(event) =>
                    onAssignFolder(tab.id, event.target.value || undefined)
                  }
                >
                  <option value="">No folder</option>
                  {library.folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
