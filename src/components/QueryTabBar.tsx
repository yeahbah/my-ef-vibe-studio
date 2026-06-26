import type { QueryTab } from "../types/query";
import { IconOpen, IconPlus, IconSave } from "./icons";

interface QueryTabBarProps {
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
  tabs,
  activeTabId,
  onSelect,
  onAdd,
  onClose,
  onOpen,
  onSave,
  onToggleFavorite,
}: QueryTabBarProps) {
  return (
    <div className="query-tab-bar">
      <div className="query-tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={tab.id === activeTabId ? "query-tab active" : "query-tab"}
          >
            <button type="button" className="query-tab-label" onClick={() => onSelect(tab.id)}>
              {tab.favorite ? "★ " : ""}
              {tab.name}
              {tab.filePath ? "" : " *"}
            </button>
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
