export interface KeybindingSettings {
  runQuery: string;
  runPlan: string;
  toggleExplorer: string;
  saveQuery: string;
}

export const DEFAULT_KEYBINDINGS: KeybindingSettings = {
  runQuery: "Ctrl+Enter",
  runPlan: "Ctrl+Shift+Enter",
  toggleExplorer: "Ctrl+B",
  saveQuery: "Ctrl+S",
};
