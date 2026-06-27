import Editor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useCallback, useEffect, useRef, useState } from "react";
import { monacoTheme } from "../lib/theme";
import type { AppTheme } from "../types/theme";

interface NotebookCodeEditorProps {
  value: string;
  language?: "csharp" | "efvibe";
  theme?: AppTheme;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  onRun?: (source: string) => void;
}

export function NotebookCodeEditor({
  value,
  language = "csharp",
  theme = "dark",
  readOnly = false,
  onChange,
  onRun,
}: NotebookCodeEditorProps) {
  const [height, setHeight] = useState(88);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const updateHeight = useCallback((editor: Parameters<OnMount>[0]) => {
    const contentHeight = editor.getContentHeight();
    setHeight(Math.max(72, Math.min(contentHeight + 16, 320)));
  }, []);

  const runFromEditor = useCallback(() => {
    if (!onRun) {
      return;
    }

    const source = editorRef.current?.getValue() ?? value;
    if (source !== value) {
      onChange?.(source);
    }
    onRun(source);
  }, [onChange, onRun, value]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    updateHeight(editor);
    editor.onDidContentSizeChange(() => updateHeight(editor));

    if (onRun) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        runFromEditor();
      });
    }
  };

  useEffect(() => {
    const lineCount = Math.max(1, value.split("\n").length);
    setHeight(Math.max(72, Math.min(lineCount * 20 + 16, 320)));
  }, [value]);

  return (
    <div className="notebook-code-editor">
      <Editor
        height={height}
        language={language}
        theme={monacoTheme(theme)}
        value={value}
        onChange={(next) => onChange?.(next ?? "")}
        onMount={handleMount}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          folding: false,
          lineDecorationsWidth: 8,
          lineNumbersMinChars: 3,
          renderLineHighlight: readOnly ? "none" : "line",
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          scrollbar: {
            vertical: "auto",
            horizontal: "hidden",
            handleMouseWheel: true,
          },
          padding: { top: 8, bottom: 8 },
          automaticLayout: true,
          glyphMargin: false,
        }}
      />
    </div>
  );
}
