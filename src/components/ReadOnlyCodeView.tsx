import Editor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useState } from "react";
import { monacoTheme } from "../lib/theme";
import type { AppTheme } from "../types/theme";

interface ReadOnlyCodeViewProps {
  code: string;
  theme?: AppTheme;
  language?: string;
}

export function ReadOnlyCodeView({
  code,
  theme = "dark",
  language = "csharp",
}: ReadOnlyCodeViewProps) {
  const [height, setHeight] = useState(96);

  const updateHeight = useCallback((editor: Parameters<OnMount>[0]) => {
    const contentHeight = editor.getContentHeight();
    setHeight(Math.max(72, contentHeight + 12));
  }, []);

  const handleMount: OnMount = (editor) => {
    updateHeight(editor);
    editor.onDidContentSizeChange(() => updateHeight(editor));
  };

  useEffect(() => {
    setHeight(Math.max(72, code.split("\n").length * 19 + 12));
  }, [code]);

  return (
    <div className="syntax-code-block">
      <Editor
        key={code}
        height={height}
        language={language}
        theme={monacoTheme(theme)}
        value={code}
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
            vertical: "hidden",
            horizontal: "auto",
            handleMouseWheel: false,
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
  );
}
