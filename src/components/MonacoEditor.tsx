import Editor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import { forwardRef, useImperativeHandle, useRef } from "react";
import {
  dispatchRunPlan,
  dispatchRunQuery,
  resolveRunTextFromEditor,
} from "../lib/editorRun";
import { keybindingToMonacoChord, resolveKeybindings } from "../lib/keybindings";
import { resolveQueryEditorLanguage } from "../lib/sqlDetect";
import { monacoTheme } from "../lib/theme";
import type { KeybindingSettings } from "../types/keybindings";
import type { AppTheme } from "../types/theme";

export interface MonacoEditorHandle {
  getRunText: () => string;
  focus: () => void;
}

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  theme?: AppTheme;
  readOnly?: boolean;
  keybindings?: Partial<KeybindingSettings>;
  language?: "sql" | "csharp";
  /** When false, Ctrl+Enter is handled by the parent workspace instead. */
  enableRunShortcuts?: boolean;
  onRunShortcut?: (text: string) => void;
}

export const MonacoEditor = forwardRef<MonacoEditorHandle, MonacoEditorProps>(function MonacoEditor(
  {
    value,
    onChange,
    theme = "dark",
    readOnly = false,
    keybindings,
    language,
    enableRunShortcuts = true,
    onRunShortcut,
  },
  ref,
) {
  const editorRef = useRef<import("monaco-editor").editor.IStandaloneCodeEditor | null>(null);
  const resolvedKeybindings = resolveKeybindings(keybindings);
  const commandKey = `${resolvedKeybindings.runQuery}|${resolvedKeybindings.runPlan}|${enableRunShortcuts ? "shortcuts" : "no-shortcuts"}`;
  const editorLanguage = language ?? resolveQueryEditorLanguage(value);

  useImperativeHandle(
    ref,
    () => ({
      getRunText: () =>
        editorRef.current ? resolveRunTextFromEditor(editorRef.current) : value.trim(),
      focus: () => {
        editorRef.current?.focus();
      },
    }),
    [value],
  );

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    if (!enableRunShortcuts) {
      return;
    }

    const runQueryChord = keybindingToMonacoChord(
      resolvedKeybindings.runQuery,
      monaco.KeyMod,
      monaco.KeyCode,
    );
    if (runQueryChord !== undefined) {
      editor.addCommand(runQueryChord, () => {
        const text = resolveRunTextFromEditor(editor);
        if (onRunShortcut) {
          onRunShortcut(text);
          return;
        }

        dispatchRunQuery(text);
      });
    }

    const runPlanChord = keybindingToMonacoChord(
      resolvedKeybindings.runPlan,
      monaco.KeyMod,
      monaco.KeyCode,
    );
    if (runPlanChord !== undefined && !onRunShortcut) {
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
        language={editorLanguage}
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
});
