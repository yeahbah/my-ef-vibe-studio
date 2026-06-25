import type { editor as MonacoEditor } from "monaco-editor";
import { resolveRunTextFromString } from "./editorRunText";

export const RUN_QUERY_EVENT = "efvibe-run-query";

export interface RunQueryEventDetail {
  text: string;
}

export function dispatchRunQuery(text: string) {
  window.dispatchEvent(
    new CustomEvent<RunQueryEventDetail>(RUN_QUERY_EVENT, {
      detail: { text },
    }),
  );
}

export function resolveRunTextFromEditor(editor: MonacoEditor.IStandaloneCodeEditor): string {
  const model = editor.getModel();
  if (!model) {
    return editor.getValue().trim();
  }

  const selection = editor.getSelection();
  if (selection && !selection.isEmpty()) {
    return model.getValueInRange(selection).trim();
  }

  const position = editor.getPosition() ?? selection?.getEndPosition();
  if (!position) {
    return editor.getValue().trim();
  }

  return resolveRunTextFromString(model.getValue(), { cursorLine: position.lineNumber });
}

export function resolveRunTextFromTextArea(textarea: HTMLTextAreaElement): string {
  const { selectionStart, selectionEnd, value } = textarea;

  if (selectionStart !== selectionEnd) {
    return resolveRunTextFromString(value, { selectionStart, selectionEnd });
  }

  const before = value.slice(0, selectionStart);
  const cursorLine = before.split(/\r?\n/u).length;
  return resolveRunTextFromString(value, { cursorLine });
}
