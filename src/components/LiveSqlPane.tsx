import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildAutoPreviewKey, fetchLiveEditorPreview, type EditorPreviewMode } from "../lib/liveSql";
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
  autoPreviewEnabled: boolean;
  onAutoPreviewEnabledChange: (enabled: boolean) => void;
  autoPreviewAllowed?: boolean;
  running?: boolean;
  onRequestEngine?: (connectionId?: string) => void;
  onEngineBusyChange?: (delta: number) => void;
  onRun?: (text: string) => void;
  theme?: AppTheme;
  keybindings?: KeybindingSettings;
}

const AUTO_PREVIEW_DEBOUNCE_MS = 600;

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
  autoPreviewEnabled,
  onAutoPreviewEnabledChange,
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
  const lastAutoPreviewKeyRef = useRef("");
  const programmaticPreviewTextRef = useRef<string | null>(null);
  const previewRequestIdRef = useRef(0);
  const connectionSettingsRef = useRef(connectionSettings);
  connectionSettingsRef.current = connectionSettings;

  const editorIsSql = useMemo(() => looksLikeRawSql(expression), [expression]);
  const autoPreviewKey = useMemo(
    () => buildAutoPreviewKey(expression, editorIsSql, connectionSettings, searchDirectory),
    [
      connectionSettings?.context,
      connectionSettings?.project,
      connectionSettings?.toolPath,
      editorIsSql,
      expression,
      searchDirectory,
    ],
  );

  useEffect(() => {
    if (!dirty) {
      setPreviewMode(editorIsSql ? "linq" : "sql");
    }
  }, [dirty, editorIsSql]);

  const refreshPreview = useCallback(
    async (options?: { force?: boolean }) => {
      const settings = connectionSettingsRef.current;
      if (
        !settings ||
        !searchDirectory.trim() ||
        (!options?.force && autoPreviewKey === lastAutoPreviewKeyRef.current)
      ) {
        return;
      }

      lastAutoPreviewKeyRef.current = autoPreviewKey;
      const requestId = ++previewRequestIdRef.current;

      onRequestEngine?.();
      setLoading(true);
      onEngineBusyChange?.(1);
      await yieldToUi();

      try {
        const preview = await fetchLiveEditorPreview(settings, searchDirectory, expression);

        if (requestId !== previewRequestIdRef.current) {
          return;
        }

        setPreviewMode(preview.mode);
        programmaticPreviewTextRef.current = preview.content ?? "";
        setPreviewText(programmaticPreviewTextRef.current);
        setError(preview.error ?? "");
        setConfidence(preview.confidence);
        setUnsupported(preview.unsupported ?? []);
      } catch (previewError) {
        if (requestId !== previewRequestIdRef.current) {
          return;
        }

        programmaticPreviewTextRef.current = "";
        setPreviewText("");
        setUnsupported([]);
        setConfidence(undefined);
        setError(previewError instanceof Error ? previewError.message : String(previewError));
      } finally {
        if (requestId === previewRequestIdRef.current) {
          onEngineBusyChange?.(-1);
          setLoading(false);
        }
      }
    },
    [autoPreviewKey, expression, onEngineBusyChange, onRequestEngine, searchDirectory],
  );

  const refreshPreviewRef = useRef(refreshPreview);
  refreshPreviewRef.current = refreshPreview;

  useEffect(() => {
    if (
      !autoPreviewEnabled ||
      !autoPreviewAllowed ||
      !enabled ||
      dirty ||
      !connectionSettingsRef.current ||
      !searchDirectory.trim()
    ) {
      if (
        !dirty &&
        (!enabled || !connectionSettingsRef.current || !searchDirectory.trim())
      ) {
        setPreviewText("");
        setError("");
        setUnsupported([]);
        setConfidence(undefined);
        lastAutoPreviewKeyRef.current = "";
      }

      return;
    }

    if (autoPreviewKey === lastAutoPreviewKeyRef.current) {
      return;
    }

    const handle = window.setTimeout(() => {
      void refreshPreviewRef.current();
    }, AUTO_PREVIEW_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [autoPreviewAllowed, autoPreviewEnabled, autoPreviewKey, dirty, enabled, searchDirectory]);

  async function syncFromEditor() {
    setDirty(false);
    lastAutoPreviewKeyRef.current = "";
    await refreshPreview({ force: true });
  }

  function handleAutoPreviewToggle() {
    const next = !autoPreviewEnabled;
    onAutoPreviewEnabledChange(next);
    if (next && !dirty && enabled && connectionSettings && searchDirectory.trim()) {
      lastAutoPreviewKeyRef.current = "";
      void refreshPreview({ force: true });
    }
  }

  function handleRun(textOverride?: string) {
    const trimmed = (textOverride ?? previewText).trim();
    if (!trimmed || !onRun) {
      return;
    }

    onRun(trimmed);
  }

  function handlePreviewChange(next: string) {
    setPreviewText(next);

    if (programmaticPreviewTextRef.current !== null && next === programmaticPreviewTextRef.current) {
      programmaticPreviewTextRef.current = null;
      return;
    }

    programmaticPreviewTextRef.current = null;
    setDirty(true);
  }

  const previewTitle = previewMode === "linq" ? "LINQ" : "SQL";

  return (
    <section className="live-sql-pane">
      <div className="live-sql-header">
        <h3>{previewTitle}</h3>
        <div className="live-sql-header-actions">
          <button
            type="button"
            className={autoPreviewEnabled ? "live-sql-auto-btn active" : "live-sql-auto-btn"}
            aria-pressed={autoPreviewEnabled}
            title={
              autoPreviewEnabled
                ? "Disable automatic preview"
                : "Enable automatic preview"
            }
            onClick={handleAutoPreviewToggle}
          >
            Auto
          </button>
          <span className="muted">
            {formatPreviewStatus({ loading, dirty, previewMode, confidence })}
          </span>
        </div>
      </div>

      <div className="live-sql-editor">
        <MonacoEditor
          value={previewText}
          theme={theme}
          language={previewMode === "sql" ? "sql" : "csharp"}
          keybindings={keybindings}
          enableRunShortcuts={false}
          onChange={handlePreviewChange}
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
