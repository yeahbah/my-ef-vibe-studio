export function hasConsoleOutput(consoleOutput: string | null | undefined): boolean {
  return Boolean(consoleOutput?.trim());
}

export function shouldRenderStructuredScalar(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (/[\r\n\u2028\u2029]/u.test(trimmed)) {
    return false;
  }

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return true;
  }

  return /^[A-Za-z_][\w.]*\s*\{/u.test(trimmed);
}
