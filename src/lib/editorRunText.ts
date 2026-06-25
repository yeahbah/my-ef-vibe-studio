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
    if (!previous || previous.trim() === "") {
      break;
    }

    startLine -= 1;
  }

  while (endLine < lines.length) {
    const next = lines[endLine];
    if (!next || next.trim() === "") {
      break;
    }

    endLine += 1;
  }

  return lines.slice(startLine - 1, endLine).join("\n");
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
