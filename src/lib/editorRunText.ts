import { isQueryLanguageBoundary } from "./sqlDetect";

function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("--") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("*") ||
    trimmed.endsWith("*/")
  );
}

export function resolveStatementAtLine(lines: string[], lineNumber: number): string {
  if (lines.length === 0) {
    return "";
  }

  let anchorLine = Math.min(Math.max(lineNumber, 1), lines.length);

  if (lines[anchorLine - 1]?.trim() === "" && anchorLine > 1) {
    anchorLine -= 1;
  }

  let startLine = anchorLine;
  let endLine = anchorLine;

  while (startLine > 1) {
    const previous = lines[startLine - 2];
    const current = lines[startLine - 1];
    if (!previous || previous.trim() === "" || isCommentLine(previous)) {
      break;
    }

    if (isQueryLanguageBoundary(previous, current)) {
      break;
    }

    startLine -= 1;
  }

  while (endLine < lines.length) {
    const current = lines[endLine - 1];
    const next = lines[endLine];
    if (!next || next.trim() === "" || isCommentLine(next)) {
      break;
    }

    if (isQueryLanguageBoundary(current, next)) {
      break;
    }

    endLine += 1;
  }

  return lines.slice(startLine - 1, endLine).join("\n");
}

export function appendQueryExpression(current: string, addition: string): string {
  const trimmedAddition = addition.trim();
  if (!trimmedAddition) {
    return current;
  }

  const trimmedCurrent = current.trimEnd();
  if (!trimmedCurrent) {
    return trimmedAddition;
  }

  return `${trimmedCurrent}\n\n${trimmedAddition}`;
}

export function resolveRunTextFromString(
  value: string,
  options: {
    selectionStart?: number;
    selectionEnd?: number;
    cursorLine?: number;
  } = {},
): string {
  const { selectionStart, selectionEnd, cursorLine } = options;

  if (
    selectionStart !== undefined &&
    selectionEnd !== undefined &&
    selectionStart !== selectionEnd
  ) {
    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);
    return value.slice(start, end).trim();
  }

  const lines = value.split(/\r?\n/u);
  const line = cursorLine ?? lines.length;
  return resolveStatementAtLine(lines, line).trim();
}
