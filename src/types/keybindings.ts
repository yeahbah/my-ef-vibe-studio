export interface KeybindingSettings {
  runAll: string;
  runQuery: string;
  runPlan: string;
  toggleExplorer: string;
  saveQuery: string;
  nextQueryTab: string;
  previousQueryTab: string;
  newQueryTab: string;
  closeQueryTab: string;
}

export const DEFAULT_KEYBINDINGS: KeybindingSettings = {
  runAll: "F5",
  runQuery: "Ctrl+Enter",
  runPlan: "Ctrl+Shift+Enter",
  toggleExplorer: "Ctrl+B",
  saveQuery: "Ctrl+S",
  nextQueryTab: "Ctrl+Tab",
  previousQueryTab: "Ctrl+Shift+Tab",
  newQueryTab: "Ctrl+Shift+T",
  closeQueryTab: "Ctrl+W",
};
