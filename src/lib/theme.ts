import type { AppTheme } from "../types/theme";

export function applyTheme(theme: AppTheme): void {
  document.documentElement.dataset.theme = theme;
}

export function monacoTheme(theme: AppTheme): "vs" | "vs-dark" {
  return theme === "light" ? "vs" : "vs-dark";
}

export function xtermTheme(theme: AppTheme) {
  if (theme === "light") {
    return {
      background: "#f4f4f5",
      foreground: "#18181b",
      cursor: "#18181b",
      selectionBackground: "#c7d2fe",
    };
  }

  return {
    background: "#111318",
    foreground: "#e4e7ef",
    cursor: "#e4e7ef",
    selectionBackground: "#334155",
  };
}

export function toggleTheme(theme: AppTheme): AppTheme {
  return theme === "dark" ? "light" : "dark";
}
