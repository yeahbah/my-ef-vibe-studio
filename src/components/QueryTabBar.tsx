import { useEffect, useRef, useState } from "react";
import { normalizeQueryTabName } from "../lib/queryTabName";
import {
  beginTabDragSession,
  cancelTabDragSession,
  consumeTabClickSuppression,
} from "../lib/tabDragSession";
import type { QueryTab } from "../types/query";
import { ContextMenu } from "./explorer/ContextMenu";
import type { ContextMenuItem } from "./explorer/types";
import { IconOpen, IconPlus, IconSave } from "./icons";

export interface QueryTabRenameRequest {
  tabId: string;
  nonce: number;
}

interface QueryTabBarProps {
  paneId: string;
  tabs: QueryTab[];
  activeTabId: string;
  renameTabRequest?: QueryTabRenameRequest;
  onSelect: (tabId: string) => void;
  onAdd: () => void;
  onClose: (tabId: string) => void;
  onOpen: () => void;
  onSave: () => void;
  onToggleFavorite: (tabId: string) => void;
  onRename: (tabId: string, name: string) => void;
}

export function QueryTabBar({
  paneId,
  tabs,
  activeTabId,
  renameTabRequest,
  onSelect,
  onAdd,
  onClose,
  onOpen,
  onSave,
  onToggleFavorite,
  onRename,
}: QueryTabBarProps) {
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const [contextMenu, setContextMenu] = useState<
    { x: number; y: number; tabId: string } | undefined
  >();

  function handleTabSelect(tabId: string) {
    if (consumeTabClickSuppression()) {
      return;
    }

    onSelect(tabId);
  }

  function startTabDrag(event: React.MouseEvent<HTMLElement>, tabId: string) {
    if (event.button !== 0 || renamingTabId) {
      return;
    }

    beginTabDragSession({ tabId, sourcePaneId: paneId }, event.clientX, event.clientY);
  }

  function beginRename(tab: QueryTab) {
    cancelTabDragSession();
    setRenamingTabId(tab.id);
    setRenameDraft(tab.name);
  }

  function cancelRename() {
    setRenamingTabId(null);
    setRenameDraft("");
  }

  function commitRename(tab: QueryTab) {
    const nextName = normalizeQueryTabName(renameDraft, tab.name);
    onRename(tab.id, nextName);
    cancelRename();
  }

  useEffect(() => {
    if (!renameTabRequest) {
      return;
    }

    const tab = tabsRef.current.find((entry) => entry.id === renameTabRequest.tabId);

    if (!tab) {
      return;
    }

    beginRename(tab);
  }, [renameTabRequest?.nonce, renameTabRequest?.tabId]);

  useEffect(() => {
    if (!renamingTabId) {
      return;
    }

    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [renamingTabId]);

  function buildContextMenuItems(tab: QueryTab): ContextMenuItem[] {
    const items: ContextMenuItem[] = [
      {
        id: "rename",
        label: "Rename",
        onClick: () => beginRename(tab),
      },
    ];

    if (tabs.length > 1) {
      items.push({
        id: "close",
        label: "Close",
        onClick: () => onClose(tab.id),
      });
    }

    return items;
  }

  return (
    <div className="query-tab-bar">
      <div className="query-tabs" role="tablist">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={tab.id === activeTabId ? "query-tab active" : "query-tab"}
          >
            {renamingTabId === tab.id ? (
              <input
                ref={renameInputRef}
                className="query-tab-rename-input"
                value={renameDraft}
                aria-label="Rename query tab"
                onChange={(event) => setRenameDraft(event.target.value)}
                onKeyDown={(event) => {
                  event.stopPropagation();

                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitRename(tab);
                    return;
                  }

                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelRename();
                  }
                }}
                onBlur={() => commitRename(tab)}
                onClick={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onDoubleClick={(event) => event.stopPropagation()}
              />
            ) : (
              <div
                role="tab"
                aria-selected={tab.id === activeTabId}
                tabIndex={0}
                className="query-tab-label"
                title={tab.name}
                onMouseDown={(event) => startTabDrag(event, tab.id)}
                onClick={() => handleTabSelect(tab.id)}
                onDoubleClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  cancelTabDragSession();
                  beginRename(tab);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setContextMenu({ x: event.clientX, y: event.clientY, tabId: tab.id });
                }}
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
            )}
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

      {contextMenu ? (() => {
        const contextTab = tabs.find((tab) => tab.id === contextMenu.tabId);

        if (!contextTab) {
          return null;
        }

        return (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={buildContextMenuItems(contextTab)}
            onClose={() => setContextMenu(undefined)}
          />
        );
      })() : null}
    </div>
  );
}
