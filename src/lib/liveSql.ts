import { runExpressionViaDaemon } from "./daemonClient";
import type { ConnectionSettings } from "../types/connection";
import { fetchSqlToLinq } from "./sqlToLinq";
import { looksLikeRawSql } from "./sqlDetect";
import type { SqlToLinqResult } from "../types/sqlToLinq";

export type EditorPreviewMode = "sql" | "linq";

export interface LiveEditorPreview {
  mode: EditorPreviewMode;
  content?: string;
  error?: string;
  confidence?: SqlToLinqResult["confidence"];
  unsupported?: string[];
}

const TERMINAL_SUFFIXES = [
  ".ToListAsync()",
  ".ToArrayAsync()",
  ".CountAsync()",
  ".FirstOrDefaultAsync()",
  ".FirstAsync()",
  ".SingleOrDefaultAsync()",
  ".SingleAsync()",
  ".AnyAsync()",
  ".MaxAsync()",
  ".MinAsync()",
  ".AverageAsync()",
  ".SumAsync()",
  ".ToDictionaryAsync()",
  ".ToDictionary()",
  ".ToList()",
  ".ToArray()",
  ".Count()",
  ".FirstOrDefault()",
  ".First()",
  ".SingleOrDefault()",
  ".Single()",
  ".Any()",
  ".Max()",
  ".Min()",
  ".Average()",
  ".Sum()",
  ".AsEnumerable()",
];

const TERMINAL_METHOD_NAMES = [
  "ToListAsync",
  "ToArrayAsync",
  "CountAsync",
  "FirstOrDefaultAsync",
  "FirstAsync",
  "SingleOrDefaultAsync",
  "SingleAsync",
  "AnyAsync",
  "MaxAsync",
  "MinAsync",
  "AverageAsync",
  "SumAsync",
  "ToDictionaryAsync",
  "ToDictionary",
  "ToList",
  "ToArray",
  "Count",
  "FirstOrDefault",
  "First",
  "SingleOrDefault",
  "Single",
  "Any",
  "Max",
  "Min",
  "Average",
  "Sum",
  "AsEnumerable",
];

const TAKE_LIMIT_METHODS: Record<string, number> = {
  First: 1,
  FirstAsync: 1,
  FirstOrDefault: 1,
  FirstOrDefaultAsync: 1,
  Single: 2,
  SingleAsync: 2,
  SingleOrDefault: 2,
  SingleOrDefaultAsync: 2,
};

export function buildSqlProbeExpression(expression: string): string | undefined {
  let trimmed = expression.trim().replace(/;+\s*$/u, "");
  if (!trimmed) {
    return undefined;
  }

  if (looksLikeRawSql(trimmed)) {
    return undefined;
  }

  trimmed = stripToQueryStringSuffix(trimmed);
  trimmed = normalizeProbeSnippet(trimmed);
  const queryable = stripQueryableTerminals(trimmed);
  if (!queryable) {
    return undefined;
  }

  return `${wrapForTrailingMemberAccess(queryable)}.ToQueryString();`;
}

const QUERY_COMPREHENSION_KEYWORDS = [
  "from ",
  "where ",
  "select ",
  "join ",
  "into ",
  "let ",
  "orderby ",
  "group ",
  "on ",
  "equals ",
  "by ",
];

function looksLikeQueryComprehension(expression: string): boolean {
  for (const line of expression.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    let text = trimmed.startsWith("(") ? trimmed.slice(1).trimStart() : trimmed;
    const lower = text.toLowerCase();
    if (QUERY_COMPREHENSION_KEYWORDS.some((keyword) => lower.startsWith(keyword))) {
      return true;
    }
  }

  return false;
}

function isFullyParenthesized(expression: string): boolean {
  const trimmed = expression.trim();
  if (!trimmed.startsWith("(")) {
    return false;
  }

  const closeIndex = findClosingParen(trimmed, 0);
  return closeIndex === trimmed.length - 1;
}

function wrapForTrailingMemberAccess(expression: string): string {
  const trimmed = expression.trim().replace(/;+\s*$/u, "").trim();
  if (looksLikeQueryComprehension(trimmed) && !isFullyParenthesized(trimmed)) {
    return `(${trimmed})`;
  }

  return trimmed;
}

function stripToQueryStringSuffix(expression: string): string {
  const match = /\.ToQueryString\(\)\s*$/iu.exec(expression);
  if (!match) {
    return expression;
  }

  return expression.slice(0, match.index).trimEnd();
}

function normalizeProbeSnippet(expression: string): string {
  let trimmed = expression.trim().replace(/;+\s*$/u, "").trim();
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

  if (trimmed.endsWith(".AsQueryable()")) {
    trimmed = trimmed.slice(0, -".AsQueryable()".length).trimEnd();
  }

  return trimmed.trim().replace(/;+\s*$/u, "").trim();
}

function stripQueryableTerminals(expression: string): string | undefined {
  let current = expression.trim();
  if (!current) {
    return undefined;
  }

  for (const suffix of TERMINAL_SUFFIXES) {
    if (current.endsWith(suffix)) {
      current = current.slice(0, -suffix.length).trimEnd();
      break;
    }
  }

  const stripped = stripTrailingTerminalCall(current);
  if (stripped) {
    current = stripped;
  }

  return current || undefined;
}

function stripTrailingTerminalCall(expression: string): string | undefined {
  for (const methodName of TERMINAL_METHOD_NAMES) {
    const needle = `.${methodName}(`;
    const index = expression.lastIndexOf(needle);
    if (index < 0) {
      continue;
    }

    const openParenIndex = index + needle.length - 1;
    const closeParenIndex = findClosingParen(expression, openParenIndex);
    if (closeParenIndex === undefined || !isEndOfExpression(expression, closeParenIndex + 1)) {
      continue;
    }

    const queryable = expression.slice(0, index).trimEnd();
    if (!queryable) {
      return undefined;
    }

    const argumentsText = expression.slice(openParenIndex + 1, closeParenIndex);
    return finalizeQueryableProbe(queryable, methodName, argumentsText);
  }

  return undefined;
}

function finalizeQueryableProbe(
  queryable: string,
  methodName: string,
  argumentsText: string,
): string {
  const takeLimit = TAKE_LIMIT_METHODS[methodName];
  if (takeLimit === undefined || containsEagerLoad(queryable)) {
    return queryable;
  }

  const predicate = extractPredicateArgument(argumentsText);
  if (predicate) {
    return `${queryable}.Where(${predicate}).Take(${takeLimit})`;
  }

  return `${queryable}.Take(${takeLimit})`;
}

function containsEagerLoad(expression: string): boolean {
  return expression.includes(".Include(") || expression.includes(".ThenInclude(");
}

function extractPredicateArgument(argumentsText: string): string | undefined {
  const parts = splitTopLevelCommaSeparated(argumentsText);
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes("=>")) {
      return trimmed;
    }
  }

  return argumentsText.trim().includes("=>") ? argumentsText.trim() : undefined;
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
  const closeParenIndex = findClosingParen(source, openParenIndex);
  if (closeParenIndex === undefined) {
    return undefined;
  }

  return source.slice(openParenIndex + 1, closeParenIndex);
}

function findClosingParen(text: string, openParenIndex: number): number | undefined {
  if (openParenIndex < 0 || openParenIndex >= text.length || text[openParenIndex] !== "(") {
    return undefined;
  }

  let depth = 0;
  let inString: "'" | '"' | null = null;

  for (let index = openParenIndex; index < text.length; index++) {
    const character = text[index];

    if (inString) {
      if (character === inString && text[index - 1] !== "\\") {
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
        return index;
      }
    }
  }

  return undefined;
}

function isEndOfExpression(expression: string, startIndex: number): boolean {
  for (let index = startIndex; index < expression.length; index++) {
    const character = expression[index];
    if (character !== " " && character !== "\t" && character !== "\r" && character !== "\n") {
      return false;
    }
  }

  return true;
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

function splitTopLevelCommaSeparated(argumentsText: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let inString: "'" | '"' | null = null;

  for (let index = 0; index < argumentsText.length; index++) {
    const character = argumentsText[index];

    if (inString) {
      if (character === inString && argumentsText[index - 1] !== "\\") {
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

    if (character === "," && depth === 0) {
      parts.push(argumentsText.slice(start, index));
      start = index + 1;
    }
  }

  if (start < argumentsText.length) {
    parts.push(argumentsText.slice(start));
  }

  return parts;
}

export async function fetchLiveEditorPreview(
  settings: ConnectionSettings,
  searchDirectory: string,
  expression: string,
): Promise<LiveEditorPreview> {
  const trimmed = expression.trim();
  if (!trimmed) {
    return { mode: "sql" };
  }

  if (looksLikeRawSql(trimmed)) {
    const converted = await fetchSqlToLinq(settings, searchDirectory, searchDirectory, trimmed);

    if (!converted) {
      return { mode: "linq", error: "No SQL → LINQ payload returned from efvibe." };
    }

    if (!converted.linq.trim()) {
      return {
        mode: "linq",
        confidence: converted.confidence,
        unsupported: converted.unsupported,
        error:
          converted.unsupported.length > 0
            ? `Could not draft LINQ: ${converted.unsupported.join("; ")}`
            : "Could not draft LINQ from this SQL.",
      };
    }

    return {
      mode: "linq",
      content: converted.linq,
      confidence: converted.confidence,
      unsupported: converted.unsupported,
    };
  }

  const sqlPreview = await fetchLiveSqlPreview(settings, searchDirectory, expression);

  return {
    mode: "sql",
    content: sqlPreview.sql,
    error: sqlPreview.error,
  };
}

export async function fetchLiveSqlPreview(
  settings: ConnectionSettings,
  searchDirectory: string,
  expression: string,
): Promise<{ sql?: string; error?: string }> {
  const trimmed = expression.trim();
  if (looksLikeRawSql(trimmed)) {
    return { sql: trimmed };
  }

  const probe = buildSqlProbeExpression(expression);
  if (!probe) {
    return {};
  }

  const result = await runExpressionViaDaemon(settings, searchDirectory, searchDirectory, probe, false);
  if (!result.payload) {
    return { error: result.stdout || "No SQL preview returned." };
  }

  if (!result.payload.success) {
    return { error: result.payload.error ?? "SQL preview failed." };
  }

  const sql =
    result.payload.translatedSql ??
    result.payload.sql[0] ??
    (typeof result.payload.value === "string" ? result.payload.value : undefined);

  return sql ? { sql } : { error: "No translated SQL available for this expression." };
}
