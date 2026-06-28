import Editor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  appendScriptLoad,
  createScriptFile,
  deleteScriptFile,
  isScriptInLoads,
  listScriptFiles,
  readScriptContent,
  removeScriptLoad,
  scriptFileNameFromLoad,
  writeScriptContent,
  type ScriptFileEntry,
} from "../lib/scripts";
import { splitMultilineList } from "../lib/multilineList";
import { monacoTheme } from "../lib/theme";
import type { AppTheme } from "../types/theme";
import { ConfirmDialog } from "./ConfirmDialog";
import { NewScriptDialog } from "./NewScriptDialog";

type ScriptsPanelTab = "scripts" | "usings";

interface ScriptsToolViewProps {
  scriptSearchPath: string;
  scriptLoads: string[];
  scriptUsings: string[];
  theme: AppTheme;
  onScriptsChanged?: () => void;
  onScriptCreated?: (fileName: string) => void;
  onScriptLoadsChange?: (scriptLoads: string[]) => void;
  onScriptUsingsChange?: (scriptUsings: string[]) => void;
}

export function ScriptsToolView({
  scriptSearchPath,
  scriptLoads,
  scriptUsings,
  theme,
  onScriptsChanged,
  onScriptCreated,
  onScriptLoadsChange,
  onScriptUsingsChange,
}: ScriptsToolViewProps) {
  const [activeTab, setActiveTab] = useState<ScriptsPanelTab>("scripts");
  const [usingsDraft, setUsingsDraft] = useState("");
  const [files, setFiles] = useState<ScriptFileEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>();
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScriptFileEntry>();
  const [deleting, setDeleting] = useState(false);
  const selectedPathRef = useRef<string | undefined>(undefined);

  const isDirty = content !== savedContent;

  useEffect(() => {
    selectedPathRef.current = selectedPath;
  }, [selectedPath]);

  useEffect(() => {
    const usingsText = scriptUsings.join("\n");
    setUsingsDraft((previous) =>
      splitMultilineList(previous).join("\n") === usingsText ? previous : usingsText,
    );
  }, [scriptUsings]);

  const refreshFiles = useCallback(async () => {
    if (!scriptSearchPath.trim()) {
      setFiles([]);
      setSelectedPath(undefined);
      setContent("");
      setSavedContent("");
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const nextFiles = await listScriptFiles(scriptSearchPath, scriptLoads);
      setFiles(nextFiles);

      const currentPath = selectedPathRef.current;
      const stillExists = currentPath
        ? nextFiles.some((entry) => entry.path === currentPath)
        : false;

      if (!stillExists) {
        const preferred =
          nextFiles.find((entry) => entry.configured) ?? nextFiles[0];
        setSelectedPath(preferred?.path);
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Failed to list scripts.");
    } finally {
      setLoading(false);
    }
  }, [scriptLoads, scriptSearchPath]);

  useEffect(() => {
    void refreshFiles();
  }, [refreshFiles]);

  useEffect(() => {
    if (!selectedPath) {
      setContent("");
      setSavedContent("");
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(undefined);

      try {
        const nextContent = await readScriptContent(selectedPath);
        if (!cancelled) {
          setContent(nextContent);
          setSavedContent(nextContent);
          setStatus(undefined);
        }
      } catch (failure) {
        if (!cancelled) {
          setError(failure instanceof Error ? failure.message : "Failed to open script.");
          setContent("");
          setSavedContent("");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedPath]);

  const confirmDiscard = useCallback(() => {
    if (!isDirty) {
      return true;
    }

    return window.confirm("Discard unsaved changes to this script?");
  }, [isDirty]);

  const handleSelectFile = useCallback(
    (entry: ScriptFileEntry) => {
      if (entry.path === selectedPath) {
        return;
      }

      if (!confirmDiscard()) {
        return;
      }

      setSelectedPath(entry.path);
    },
    [confirmDiscard, selectedPath],
  );

  const handleSave = useCallback(async () => {
    if (!selectedPath || !isDirty) {
      return;
    }

    setSaving(true);
    setError(undefined);

    try {
      await writeScriptContent(selectedPath, content);
      setSavedContent(content);
      setStatus("Saved");
      onScriptsChanged?.();
      await refreshFiles();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Failed to save script.");
    } finally {
      setSaving(false);
    }
  }, [content, isDirty, onScriptsChanged, refreshFiles, selectedPath]);

  const handleOpenCreateDialog = useCallback(() => {
    if (!scriptSearchPath.trim()) {
      return;
    }

    if (!confirmDiscard()) {
      return;
    }

    setCreateDialogOpen(true);
  }, [confirmDiscard, scriptSearchPath]);

  const handleCreateScript = useCallback(
    async (name: string) => {
      setLoading(true);
      setError(undefined);

      try {
        const path = await createScriptFile(scriptSearchPath, name);
        await refreshFiles();
        setSelectedPath(path);
        onScriptCreated?.(scriptFileNameFromLoad(path));
        onScriptsChanged?.();
      } finally {
        setLoading(false);
      }
    },
    [onScriptCreated, onScriptsChanged, refreshFiles, scriptSearchPath],
  );

  const handleOpenDeleteDialog = useCallback(() => {
    const entry = selectedPath
      ? files.find((candidate) => candidate.path === selectedPath)
      : undefined;

    if (!entry?.existsOnDisk) {
      return;
    }

    setDeleteTarget(entry);
  }, [files, selectedPath]);

  const handleDeleteScript = useCallback(async () => {
    if (!deleteTarget?.existsOnDisk) {
      return;
    }

    const target = deleteTarget;
    setDeleteTarget(undefined);
    setDeleting(true);
    setError(undefined);

    try {
      await deleteScriptFile(target.path);
      if (selectedPathRef.current === target.path) {
        setSelectedPath(undefined);
        setContent("");
        setSavedContent("");
      }
      setStatus("Deleted");
      onScriptsChanged?.();
      await refreshFiles();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Failed to delete script.");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, onScriptsChanged, refreshFiles]);

  const handleToggleEntryLoad = useCallback(
    (entry: ScriptFileEntry, loaded: boolean) => {
      if (!onScriptLoadsChange) {
        return;
      }

      const currentlyLoaded = isScriptInLoads(scriptLoads, entry.name);
      if (loaded === currentlyLoaded) {
        return;
      }

      const nextLoads = loaded
        ? appendScriptLoad(scriptLoads, entry.name)
        : removeScriptLoad(scriptLoads, entry.name);

      if (nextLoads.length === scriptLoads.length) {
        return;
      }

      onScriptLoadsChange(nextLoads);
      setStatus(loaded ? "Added to script loads" : "Removed from script loads");
    },
    [onScriptLoadsChange, scriptLoads],
  );

  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      void handleSave();
    });
  };

  const handleSelectTab = useCallback(
    (nextTab: ScriptsPanelTab) => {
      if (nextTab === activeTab) {
        return;
      }

      if (activeTab === "scripts" && isDirty && !confirmDiscard()) {
        return;
      }

      setActiveTab(nextTab);
    },
    [activeTab, confirmDiscard, isDirty],
  );

  const selectedEntry = files.find((entry) => entry.path === selectedPath);

  return (
    <>
      <NewScriptDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleCreateScript}
      />
      <ConfirmDialog
        open={deleteTarget !== undefined}
        title="Delete script?"
        message={`Delete ${deleteTarget?.name ?? "this script"} from disk? This cannot be undone.`}
        detail={
          deleteTarget?.configured
            ? "This script is listed in connection Script loads. Remove it there if you no longer want it loaded at session start."
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onClose={() => setDeleteTarget(undefined)}
        onConfirm={() => {
          void handleDeleteScript();
        }}
      />
      <div className="scripts-tool-view">
        <div
          className="scripts-tool-tabs"
          role="tablist"
          aria-label="Script session"
        >
          <button
            type="button"
            role="tab"
            className={`scripts-tool-tab${activeTab === "scripts" ? " active" : ""}`}
            aria-selected={activeTab === "scripts"}
            onClick={() => handleSelectTab("scripts")}
          >
            Scripts
          </button>
          <button
            type="button"
            role="tab"
            className={`scripts-tool-tab${activeTab === "usings" ? " active" : ""}`}
            aria-selected={activeTab === "usings"}
            onClick={() => handleSelectTab("usings")}
          >
            Additional Usings
          </button>
        </div>

        {activeTab === "scripts" ? (
          !scriptSearchPath.trim() ? (
            <div className="scripts-tool-empty">
              <p>
                Set <strong>Script search path</strong> on the active connection to browse and edit
                `.csx` helper scripts.
              </p>
            </div>
          ) : (
            <>
              <div className="scripts-tool-toolbar">
                <span className="scripts-tool-path" title={scriptSearchPath}>
                  {scriptSearchPath}
                </span>
                <div className="scripts-tool-actions">
                  <button type="button" onClick={() => void refreshFiles()} disabled={loading}>
                    Refresh
                  </button>
                  <button type="button" onClick={handleOpenCreateDialog} disabled={loading}>
                    New…
                  </button>
                  <button
                    type="button"
                    className="scripts-tool-delete"
                    onClick={handleOpenDeleteDialog}
                    disabled={!selectedEntry?.existsOnDisk || loading || deleting}
                    title={
                      selectedEntry && !selectedEntry.existsOnDisk
                        ? "This script is only referenced in connection settings and has no file on disk."
                        : "Delete the selected script file"
                    }
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={!selectedPath || !isDirty || saving}
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>

              {error ? <p className="scripts-tool-error">{error}</p> : null}
              {status ? <p className="scripts-tool-status">{status}</p> : null}

              <div className="scripts-tool-body">
                <ul className="scripts-tool-list" aria-label="Script files">
                  {files.length === 0 ? (
                    <li className="scripts-tool-list-empty">
                      {loading ? "Loading scripts…" : "No `.csx` files found."}
                    </li>
                  ) : (
                    files.map((entry) => {
                      const loaded = isScriptInLoads(scriptLoads, entry.name);

                      return (
                        <li
                          key={entry.path}
                          className={`scripts-tool-list-row${entry.path === selectedPath ? " active" : ""}`}
                        >
                          <button
                            type="button"
                            className="scripts-tool-list-item"
                            onClick={() => handleSelectFile(entry)}
                          >
                            <span className="scripts-tool-list-name">{entry.name}</span>
                          </button>
                          <label
                            className="scripts-tool-load-toggle"
                            title={
                              loaded
                                ? "Loaded at session start — click to unload"
                                : "Not loaded at session start — click to load"
                            }
                          >
                            <input
                              type="checkbox"
                              checked={loaded}
                              disabled={loading || !onScriptLoadsChange}
                              aria-label={`Load ${entry.name} at session start`}
                              onChange={(event) => {
                                event.stopPropagation();
                                handleToggleEntryLoad(entry, event.target.checked);
                              }}
                              onClick={(event) => event.stopPropagation()}
                            />
                            <span aria-hidden="true">Load</span>
                          </label>
                        </li>
                      );
                    })
                  )}
                </ul>

                <div className="scripts-tool-editor">
                  {selectedEntry ? (
                    <>
                      <div className="scripts-tool-editor-header">
                        <span>{selectedEntry.name}</span>
                        {isDirty ? <span className="scripts-tool-dirty">Unsaved</span> : null}
                      </div>
                      <div className="scripts-tool-editor-host">
                        <Editor
                          height="100%"
                          language="csharp"
                          theme={monacoTheme(theme)}
                          value={content}
                          onChange={(next) => {
                            setContent(next ?? "");
                            setStatus(undefined);
                          }}
                          onMount={handleMount}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 13,
                            lineNumbers: "on",
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            wordWrap: "on",
                            tabSize: 2,
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="scripts-tool-editor-empty">
                      {loading ? "Loading…" : "Select a script to edit."}
                    </div>
                  )}
                </div>
              </div>
            </>
          )
        ) : (
          <div className="scripts-tool-usings">
            <p className="scripts-tool-usings-hint">
              Namespaces imported into every query for this connection. The{" "}
              <code>using</code> prefix is optional.
            </p>
            <label className="scripts-tool-usings-label">
              <span>One namespace per line</span>
              <textarea
                className="scripts-tool-usings-input"
                rows={14}
                value={usingsDraft}
                disabled={!onScriptUsingsChange}
                placeholder={"MyApp.QueryHelpers\nSystem.Globalization"}
                onChange={(event) => {
                  const next = event.target.value;
                  setUsingsDraft(next);
                  onScriptUsingsChange?.(splitMultilineList(next));
                }}
              />
            </label>
          </div>
        )}
      </div>
    </>
  );
}
