import type { QueryTab } from "../types/query";
import { beginTabDragSession, consumeTabClickSuppression } from "../lib/tabDragSession";
import { IconOpen, IconPlus, IconSave } from "./icons";

interface QueryTabBarProps {
  paneId: string;
  tabs: QueryTab[];
  activeTabId: string;
  onSelect: (tabId: string) => void;
  onAdd: () => void;
  onClose: (tabId: string) => void;
  onOpen: () => void;
  onSave: () => void;
  onToggleFavorite: (tabId: string) => void;
}

export function QueryTabBar({
  paneId,
  tabs,
  activeTabId,
  onSelect,
  onAdd,
  onClose,
  onOpen,
  onSave,
  onToggleFavorite,
}: QueryTabBarProps) {
  function handleTabSelect(tabId: string) {
    if (consumeTabClickSuppression()) {
      return;
    }

    onSelect(tabId);
  }

  function startTabDrag(event: React.MouseEvent<HTMLElement>, tabId: string) {
    if (event.button !== 0) {
      return;
    }

    beginTabDragSession(
      { tabId, sourcePaneId: paneId },
      event.clientX,
      event.clientY,
    );
  }

  return (
    <div className="query-tab-bar">
      <div className="query-tabs" role="tablist">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={tab.id === activeTabId ? "query-tab active" : "query-tab"}
          >
            <div
              role="tab"
              aria-selected={tab.id === activeTabId}
              tabIndex={0}
              className="query-tab-label"
              title="Drag to split pane"
              onMouseDown={(event) => startTabDrag(event, tab.id)}
              onClick={() => handleTabSelect(tab.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleTabSelect(tab.id);
                }
              }}
            >
              {tab.favorite ? "★ " : ""}
              {tab.name}
              {tab.filePath ? "" : " *"}
            </div>
            <button
              type="button"
              className={tab.favorite ? "query-tab-fav active" : "query-tab-fav"}
              aria-label={tab.favorite ? "Unfavorite" : "Favorite"}
              onClick={() => onToggleFavorite(tab.id)}
            >
              ★
            </button>
            {tabs.length > 1 && (
              <button
                type="button"
                className="query-tab-close"
                aria-label={`Close ${tab.name}`}
                onClick={() => onClose(tab.id)}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button type="button" className="query-tab-add" title="New query tab" aria-label="New query tab" onClick={onAdd}>
          <IconPlus />
        </button>
      </div>
      <div className="query-tab-actions">
        <button type="button" className="query-tab-icon-btn" title="Open query" aria-label="Open query" onClick={onOpen}>
          <IconOpen />
        </button>
        <button type="button" className="query-tab-icon-btn" title="Save query" aria-label="Save query" onClick={onSave}>
          <IconSave />
        </button>
      </div>
    </div>
  );
}
