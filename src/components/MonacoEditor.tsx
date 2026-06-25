import Editor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import { dispatchRunQuery, resolveRunTextFromEditor } from "../lib/editorRun";
import { monacoTheme } from "../lib/theme";
import type { AppTheme } from "../types/theme";

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  theme?: AppTheme;
  readOnly?: boolean;
}

export function MonacoEditor({ value, onChange, theme = "dark", readOnly = false }: MonacoEditorProps) {
  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(
      // eslint-disable-next-line no-bitwise
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        dispatchRunQuery(resolveRunTextFromEditor(editor));
      },
    );
  };

  return (
    <div className="monaco-host">
      <Editor
        height="100%"
        defaultLanguage="csharp"
        theme={monacoTheme(theme)}
        value={value}
        onChange={(next) => onChange(next ?? "")}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          readOnly,
          wordWrap: "on",
        }}
      />
    </div>
  );
}
