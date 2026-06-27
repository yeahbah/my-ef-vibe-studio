import Editor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createScriptFile,
  listScriptFiles,
  readScriptContent,
  writeScriptContent,
  type ScriptFileEntry,
} from "../lib/scripts";
import { monacoTheme } from "../lib/theme";
import type { AppTheme } from "../types/theme";

interface ScriptsToolViewProps {
  scriptSearchPath: string;
  scriptLoads: string[];
  theme: AppTheme;
  onScriptsChanged?: () => void;
}

export function ScriptsToolView({
  scriptSearchPath,
  scriptLoads,
  theme,
  onScriptsChanged,
}: ScriptsToolViewProps) {
  const [files, setFiles] = useState<ScriptFileEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>();
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<string>();
  const selectedPathRef = useRef<string | undefined>(undefined);

  const isDirty = content !== savedContent;

  useEffect(() => {
    selectedPathRef.current = selectedPath;
  }, [selectedPath]);

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

  const handleCreateScript = useCallback(async () => {
    if (!scriptSearchPath.trim()) {
      return;
    }

    if (!confirmDiscard()) {
      return;
    }

    const name = window.prompt("New script file name", "helpers.csx");
    if (!name?.trim()) {
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const path = await createScriptFile(scriptSearchPath, name.trim());
      await refreshFiles();
      setSelectedPath(path);
      onScriptsChanged?.();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Failed to create script.");
    } finally {
      setLoading(false);
    }
  }, [confirmDiscard, onScriptsChanged, refreshFiles, scriptSearchPath]);

  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      void handleSave();
    });
  };

  const selectedEntry = files.find((entry) => entry.path === selectedPath);

  if (!scriptSearchPath.trim()) {
    return (
      <div className="scripts-tool-empty">
        <p>
          Set <strong>Script search path</strong> on the active connection to browse and edit
          `.csx` helper scripts.
        </p>
      </div>
    );
  }

  return (
    <div className="scripts-tool-view">
      <div className="scripts-tool-toolbar">
        <span className="scripts-tool-path" title={scriptSearchPath}>
          {scriptSearchPath}
        </span>
        <div className="scripts-tool-actions">
          <button type="button" onClick={() => void refreshFiles()} disabled={loading}>
            Refresh
          </button>
          <button type="button" onClick={() => void handleCreateScript()} disabled={loading}>
            New…
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
            files.map((entry) => (
              <li key={entry.path}>
                <button
                  type="button"
                  className={`scripts-tool-list-item${entry.path === selectedPath ? " active" : ""}`}
                  onClick={() => handleSelectFile(entry)}
                >
                  <span className="scripts-tool-list-name">{entry.name}</span>
                  {entry.configured ? (
                    <span className="scripts-tool-list-badge">load</span>
                  ) : null}
                </button>
              </li>
            ))
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
    </div>
  );
}
