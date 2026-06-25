import Editor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function MonacoEditor({ value, onChange, readOnly = false }: MonacoEditorProps) {
  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(
      // eslint-disable-next-line no-bitwise
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        window.dispatchEvent(new CustomEvent("efvibe-run-query"));
      },
    );
  };

  return (
    <div className="monaco-host">
      <Editor
        height="100%"
        defaultLanguage="csharp"
        theme="vs-dark"
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
