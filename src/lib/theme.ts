import type { AppTheme } from "../types/theme";

export function applyTheme(theme: AppTheme): void {
  document.documentElement.dataset.theme = theme;
}

export function monacoTheme(theme: AppTheme): "vs" | "vs-dark" {
  return theme === "light" ? "vs" : "vs-dark";
}

export function toggleTheme(theme: AppTheme): AppTheme {
  return theme === "dark" ? "light" : "dark";
}
