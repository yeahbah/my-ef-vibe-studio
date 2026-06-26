import { useEffect, useMemo, useRef, useState } from "react";
import { fetchLiveEditorPreview, type EditorPreviewMode } from "../lib/liveSql";
import { looksLikeRawSql } from "../lib/sqlDetect";
import { yieldToUi } from "../lib/yieldToUi";
import type { ConnectionSettings } from "../types/connection";
import type { KeybindingSettings } from "../types/keybindings";
import type { SqlToLinqResult } from "../types/sqlToLinq";
import type { AppTheme } from "../types/theme";
import { MonacoEditor } from "./MonacoEditor";

interface LiveSqlPaneProps {
  expression: string;
  connectionSettings: ConnectionSettings | undefined;
  searchDirectory: string;
  enabled: boolean;
  autoPreviewAllowed?: boolean;
  running?: boolean;
  onRequestEngine?: () => void;
  onEngineBusyChange?: (delta: number) => void;
  onRun?: (text: string) => void;
  theme?: AppTheme;
  keybindings?: KeybindingSettings;
}

function formatPreviewStatus(input: {
  loading: boolean;
  dirty: boolean;
  previewMode: EditorPreviewMode;
  confidence?: SqlToLinqResult["confidence"];
}): string {
  if (input.loading) {
    return input.previewMode === "linq" ? "Converting SQL…" : "Translating LINQ…";
  }

  if (input.dirty) {
    return input.previewMode === "linq" ? "Custom LINQ" : "Custom SQL";
  }

  if (input.previewMode === "linq" && input.confidence) {
    return `SQL → LINQ draft (${input.confidence})`;
  }

  return input.previewMode === "linq" ? "SQL → LINQ preview" : "LINQ → SQL preview";
}

export function LiveSqlPane({
  expression,
  connectionSettings,
  searchDirectory,
  enabled,
  autoPreviewAllowed = false,
  running = false,
  onRequestEngine,
  onEngineBusyChange,
  onRun,
  theme = "dark",
  keybindings,
}: LiveSqlPaneProps) {
  const [previewText, setPreviewText] = useState("");
  const [previewMode, setPreviewMode] = useState<EditorPreviewMode>("sql");
  const [confidence, setConfidence] = useState<SqlToLinqResult["confidence"]>();
  const [unsupported, setUnsupported] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const skipInitialPreviewRef = useRef(true);

  const editorIsSql = useMemo(() => looksLikeRawSql(expression), [expression]);

  useEffect(() => {
    if (!dirty) {
      setPreviewMode(editorIsSql ? "linq" : "sql");
    }
  }, [dirty, editorIsSql]);

  useEffect(() => {
    if (skipInitialPreviewRef.current) {
      skipInitialPreviewRef.current = false;
      return;
    }

    if (!autoPreviewAllowed || !enabled || dirty || !connectionSettings || !searchDirectory.trim()) {
      if (!dirty) {
        if (!enabled || !connectionSettings || !searchDirectory.trim()) {
          setPreviewText("");
          setError("");
          setUnsupported([]);
          setConfidence(undefined);
        }
      }

      return;
    }

    const handle = window.setTimeout(() => {
      void refreshPreview();
    }, 600);

    return () => window.clearTimeout(handle);
  }, [
    autoPreviewAllowed,
    connectionSettings,
    dirty,
    enabled,
    expression,
    searchDirectory,
  ]);

  async function refreshPreview() {
    onRequestEngine?.();

    if (!connectionSettings || !searchDirectory.trim()) {
      return;
    }

    setLoading(true);
    onEngineBusyChange?.(1);
    await yieldToUi();

    try {
      const preview = await fetchLiveEditorPreview(
        connectionSettings,
        searchDirectory,
        expression,
      );

      setPreviewMode(preview.mode);
      setPreviewText(preview.content ?? "");
      setError(preview.error ?? "");
      setConfidence(preview.confidence);
      setUnsupported(preview.unsupported ?? []);
    } catch (previewError) {
      setPreviewText("");
      setUnsupported([]);
      setConfidence(undefined);
      setError(previewError instanceof Error ? previewError.message : String(previewError));
    } finally {
      onEngineBusyChange?.(-1);
      setLoading(false);
    }
  }

  async function syncFromEditor() {
    setDirty(false);
    await refreshPreview();
  }

  function handleRun(textOverride?: string) {
    const trimmed = (textOverride ?? previewText).trim();
    if (!trimmed || !onRun) {
      return;
    }

    onRun(trimmed);
  }

  const previewTitle = previewMode === "linq" ? "LINQ" : "SQL";

  return (
    <section className="live-sql-pane">
      <div className="live-sql-header">
        <h3>{previewTitle}</h3>
        <span className="muted">
          {formatPreviewStatus({ loading, dirty, previewMode, confidence })}
        </span>
      </div>

      <div className="live-sql-editor">
        <MonacoEditor
          value={previewText}
          theme={theme}
          language={previewMode === "sql" ? "sql" : "csharp"}
          keybindings={keybindings}
          enableRunShortcuts={false}
          onChange={(next) => {
            setPreviewText(next);
            setDirty(true);
          }}
        />
      </div>

      {error && !dirty ? <p className="error-text">{error}</p> : null}
      {unsupported.length > 0 && !dirty && !error ? (
        <ul className="live-sql-warnings">
          {unsupported.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}

      <div className="live-sql-actions">
        {onRun ? (
          <button
            type="button"
            disabled={running || !previewText.trim()}
            onClick={() => handleRun()}
          >
            Run
          </button>
        ) : null}
        <button type="button" disabled={loading} onClick={() => void syncFromEditor()}>
          Sync from editor
        </button>
      </div>
    </section>
  );
}
