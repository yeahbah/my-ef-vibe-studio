import { getFindingDismissalKey } from "./scanSession";
import type { ScanCiOutputDocument, ScanFindingDto, ScanMode, ScanReviewItem } from "../types/scan";

export function findingsToReviewItems(
  document: ScanCiOutputDocument,
  mode: ScanMode,
): ScanReviewItem[] {
  return document.findings.map((finding) => ({
    key: getFindingDismissalKey(finding),
    finding,
    scanMode: mode,
  }));
}

export function formatFindingSummary(finding: ScanFindingDto): string {
  const parts = [finding.ruleId, finding.message];
  if (finding.severity) {
    parts.unshift(`[${finding.severity}]`);
  }
  return parts.join(" — ");
}

export function scanCodeToRunnableExpression(code: string): string {
  let trimmed = code.trim().replace(/;+$/u, "").trim();
  trimmed = stripControlFlowWrapper(trimmed);

  if (trimmed.startsWith("var ")) {
    const equalsIndex = findVarDeclarationEquals(trimmed);
    if (equalsIndex >= 0) {
      trimmed = trimmed.slice(equalsIndex + 1).trim();
    }
  }

  if (trimmed.startsWith("return ")) {
    trimmed = trimmed.slice("return ".length).trim();
  }

  if (trimmed.startsWith("await ")) {
    trimmed = trimmed.slice("await ".length).trim();
  }

  trimmed = stripNullCoalescingSuffix(trimmed);
  trimmed = replaceDbContextAliases(trimmed);

  return trimmed.trim().replace(/;+$/u, "").trim();
}

function stripControlFlowWrapper(trimmed: string): string {
  for (const keyword of ["if", "while", "switch"] as const) {
    const prefix = `${keyword} (`;
    if (!trimmed.startsWith(prefix)) {
      continue;
    }

    const openParenIndex = trimmed.indexOf("(");
    if (openParenIndex < 0) {
      return trimmed;
    }

    const inner = extractParenthesizedContent(trimmed, openParenIndex);
    if (inner) {
      return inner.trim();
    }
  }

  return trimmed;
}

function extractParenthesizedContent(source: string, openParenIndex: number): string | undefined {
  let depth = 0;
  let inString: "'" | '"' | null = null;

  for (let index = openParenIndex; index < source.length; index++) {
    const character = source[index];

    if (inString) {
      if (character === inString && source[index - 1] !== "\\") {
        inString = null;
      }
      continue;
    }

    if (character === "'" || character === '"') {
      inString = character;
      continue;
    }

    if (character === "(") {
      depth++;
      continue;
    }

    if (character === ")") {
      depth--;
      if (depth === 0) {
        return source.slice(openParenIndex + 1, index);
      }
    }
  }

  return undefined;
}

function findVarDeclarationEquals(trimmed: string): number {
  let depth = 0;
  let inString: "'" | '"' | null = null;

  for (let index = 4; index < trimmed.length; index++) {
    const character = trimmed[index];

    if (inString) {
      if (character === inString && trimmed[index - 1] !== "\\") {
        inString = null;
      }
      continue;
    }

    if (character === "'" || character === '"') {
      inString = character;
      continue;
    }

    if (character === "(" || character === "[" || character === "{") {
      depth++;
      continue;
    }

    if (character === ")" || character === "]" || character === "}") {
      depth--;
      continue;
    }

    if (character === "=" && depth === 0 && trimmed[index + 1] !== "=") {
      return index;
    }
  }

  return -1;
}

function stripNullCoalescingSuffix(trimmed: string): string {
  let depth = 0;
  let inString: "'" | '"' | null = null;

  for (let index = 0; index < trimmed.length - 1; index++) {
    const character = trimmed[index];

    if (inString) {
      if (character === inString && trimmed[index - 1] !== "\\") {
        inString = null;
      }
      continue;
    }

    if (character === "'" || character === '"') {
      inString = character;
      continue;
    }

    if (character === "(" || character === "[" || character === "{") {
      depth++;
      continue;
    }

    if (character === ")" || character === "]" || character === "}") {
      depth--;
      continue;
    }

    if (character === "?" && depth === 0 && trimmed[index + 1] === "?") {
      return trimmed.slice(0, index).trim();
    }
  }

  return trimmed;
}

function replaceDbContextAliases(code: string): string {
  return [
    ["this.dbContext.", "db."],
    ["this.DbContext.", "db."],
    ["this._dbContext.", "db."],
    ["this._context.", "db."],
    ["this.context.", "db."],
    ["this._db.", "db."],
    ["dbContext.", "db."],
    ["DbContext.", "db."],
    ["_dbContext.", "db."],
    ["_context.", "db."],
    ["_db.", "db."],
    ["applicationDbContext.", "db."],
    ["_applicationDbContext.", "db."],
  ].reduce((current, [from, to]) => current.split(from).join(to), code);
}
