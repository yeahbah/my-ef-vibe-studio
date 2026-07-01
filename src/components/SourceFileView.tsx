import Editor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import { useEffect, useRef, useState } from "react";
import { loadSourceFile, sourceFileLabel } from "../lib/sourceFile";
import { monacoTheme } from "../lib/theme";
import type { AppTheme } from "../types/theme";

interface SourceFileViewProps {
  filePath: string;
  line: number;
  theme?: AppTheme;
  height?: number;
  fill?: boolean;
  showHeader?: boolean;
}

export function SourceFileView({
  filePath,
  line,
  theme = "dark",
  height = 240,
  fill = false,
  showHeader = true,
}: SourceFileViewProps) {
  const [source, setSource] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [fillHeight, setFillHeight] = useState(height);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const decorationIds = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(undefined);
    setSource(undefined);

    void loadSourceFile(filePath)
      .then((text) => {
        if (!cancelled) {
          setSource(text);
          setLoading(false);
        }
      })
      .catch((failure) => {
        if (!cancelled) {
          setError(failure instanceof Error ? failure.message : String(failure));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filePath]);

  useEffect(() => {
    if (!fill) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateHeight = () => {
      setFillHeight(Math.max(160, container.clientHeight));
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(container);
    return () => observer.disconnect();
  }, [fill, source, loading, error]);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    if (!editor || !monaco || !source) {
      return;
    }

    const targetLine = Math.max(1, Math.min(line, editor.getModel()?.getLineCount() ?? line));
    editor.revealLineInCenter(targetLine);
    editor.setPosition({ lineNumber: targetLine, column: 1 });
    decorationIds.current = editor.deltaDecorations(decorationIds.current, [
      {
        range: new monaco.Range(targetLine, 1, targetLine, 1),
        options: {
          isWholeLine: true,
          className: "scan-source-highlight-line",
        },
      },
    ]);
  }, [line, source]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const targetLine = Math.max(1, line);
    editor.revealLineInCenter(targetLine);
    editor.setPosition({ lineNumber: targetLine, column: 1 });
    decorationIds.current = editor.deltaDecorations(decorationIds.current, [
      {
        range: new monaco.Range(targetLine, 1, targetLine, 1),
        options: {
          isWholeLine: true,
          className: "scan-source-highlight-line",
        },
      },
    ]);
  };

  if (loading) {
    return <p className="muted scan-source-status">Loading source…</p>;
  }

  if (error) {
    return <p className="error-text scan-source-status">{error}</p>;
  }

  if (!source) {
    return null;
  }

  const editorHeight = fill ? fillHeight : height;

  return (
    <div className={`scan-source-view${fill ? " scan-source-view-fill" : ""}`}>
      {showHeader ? (
        <div className="scan-source-view-header">
          <span className="scan-source-view-label">Source</span>
          <span className="scan-source-view-path muted" title={filePath}>
            {sourceFileLabel(filePath)}:{line}
          </span>
        </div>
      ) : null}
      <div
        ref={fill ? containerRef : undefined}
        className={`syntax-code-block scan-source-editor${fill ? " scan-source-editor-fill" : ""}`}
      >
        <Editor
          key={`${filePath}:${source.length}:${fill ? "fill" : "fixed"}`}
          height={editorHeight}
          language="csharp"
          theme={monacoTheme(theme)}
          value={source}
          onMount={handleMount}
          options={{
            readOnly: true,
            domReadOnly: true,
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "off",
            folding: true,
            renderLineHighlight: "none",
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            scrollbar: {
              vertical: "auto",
              horizontal: "auto",
              handleMouseWheel: true,
            },
            contextmenu: false,
            selectionHighlight: false,
            occurrencesHighlight: "off",
            renderValidationDecorations: "off",
            padding: { top: 8, bottom: 8 },
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
