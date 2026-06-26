import Editor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import {
  dispatchRunPlan,
  dispatchRunQuery,
  resolveRunTextFromEditor,
} from "../lib/editorRun";
import { keybindingToMonacoChord, resolveKeybindings } from "../lib/keybindings";
import { monacoTheme } from "../lib/theme";
import type { KeybindingSettings } from "../types/keybindings";
import type { AppTheme } from "../types/theme";

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  theme?: AppTheme;
  readOnly?: boolean;
  keybindings?: Partial<KeybindingSettings>;
}

export function MonacoEditor({
  value,
  onChange,
  theme = "dark",
  readOnly = false,
  keybindings,
}: MonacoEditorProps) {
  const resolvedKeybindings = resolveKeybindings(keybindings);
  const commandKey = `${resolvedKeybindings.runQuery}|${resolvedKeybindings.runPlan}`;

  const handleMount: OnMount = (editor, monaco) => {
    const runQueryChord = keybindingToMonacoChord(
      resolvedKeybindings.runQuery,
      monaco.KeyMod,
      monaco.KeyCode,
    );
    if (runQueryChord !== undefined) {
      editor.addCommand(runQueryChord, () => {
        dispatchRunQuery(resolveRunTextFromEditor(editor));
      });
    }

    const runPlanChord = keybindingToMonacoChord(
      resolvedKeybindings.runPlan,
      monaco.KeyMod,
      monaco.KeyCode,
    );
    if (runPlanChord !== undefined) {
      editor.addCommand(runPlanChord, () => {
        dispatchRunPlan(resolveRunTextFromEditor(editor));
      });
    }
  };

  return (
    <div className="monaco-host">
      <Editor
        key={commandKey}
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
