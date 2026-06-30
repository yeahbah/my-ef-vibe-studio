import type { Monaco } from "@monaco-editor/react";
import type { editor, IDisposable, languages, Position } from "monaco-editor";
import {
  completionReplaceRange,
  fetchCompletions,
  getActiveCompletionContext,
  readDbPrefix,
} from "./completions";

let registration: IDisposable | undefined;

function mapKind(monaco: Monaco, kind: string): languages.CompletionItemKind {
  return kind === "method"
    ? monaco.languages.CompletionItemKind.Method
    : monaco.languages.CompletionItemKind.Property;
}

export function ensureEfvibeCompletionProvider(monaco: Monaco): void {
  if (registration) {
    return;
  }

  registration = monaco.languages.registerCompletionItemProvider("csharp", {
    triggerCharacters: ["."],
    provideCompletionItems: async (model: editor.ITextModel, position: Position) => {
      const context = getActiveCompletionContext();
      if (!context?.connectionSettings.project.trim()) {
        return { suggestions: [] };
      }

      const linePrefix = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });
      const prefix = readDbPrefix(linePrefix);
      if (!prefix) {
        return { suggestions: [] };
      }

      const items = await fetchCompletions(
        context.connectionSettings,
        context.searchDirectory,
        context.cwd,
        prefix,
      );

      const range = completionReplaceRange(prefix, position.lineNumber, position.column);

      return {
        suggestions: items.map((item) => ({
          label: item.label,
          kind: mapKind(monaco, item.kind),
          insertText: item.insertText,
          detail: item.detail,
          range,
          sortText: item.label.toLowerCase(),
        })),
      };
    },
  });
}
