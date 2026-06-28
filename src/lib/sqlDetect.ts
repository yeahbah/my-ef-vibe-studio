const RAW_SQL_PATTERN =
  /^(SELECT|WITH|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|MERGE|EXEC|EXECUTE|EXPLAIN|SHOW|DESCRIBE|DESC|PRAGMA|BEGIN|COMMIT|ROLLBACK|GRANT|REVOKE|USE|DECLARE|SET)\b/iu;

const SQL_PREAMBLE_PATTERN = /^(DECLARE|SET)\b/iu;

const LINQ_PATTERN =
  /^(db\.|await\s|var\s|return\s|using\s|namespace\s|public\s|private\s|from\s+\S+\s+in\s+)/iu;

function isSqlPreambleLine(line: string): boolean {
  return SQL_PREAMBLE_PATTERN.test(line);
}

function enumerateSqlStatements(text: string): string[] {
  return text
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function firstMeaningfulStatement(text: string): string {
  for (const statement of enumerateSqlStatements(text)) {
    const line = firstMeaningfulLine(statement);
    if (line) {
      return line;
    }
  }

  return "";
}

function firstMeaningfulLine(text: string): string {
  for (const line of text.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || isSqlCommentLine(trimmed) || isSqlPreambleLine(trimmed)) {
      continue;
    }

    return trimmed;
  }

  return "";
}

function isSqlCommentLine(line: string): boolean {
  return line.startsWith("--") || line.startsWith("/*") || line.startsWith("#");
}

export function stripLeadingSqlComments(text: string): string {
  let remaining = text.trimStart();

  while (remaining.length > 0) {
    if (remaining.startsWith("--")) {
      const newline = remaining.indexOf("\n");
      if (newline === -1) {
        return "";
      }

      remaining = remaining.slice(newline + 1).trimStart();
      continue;
    }

    if (remaining.startsWith("/*")) {
      const end = remaining.indexOf("*/");
      if (end === -1) {
        return "";
      }

      remaining = remaining.slice(end + 2).trimStart();
      continue;
    }

    break;
  }

  return remaining;
}

export function looksLikeRawSql(text: string): boolean {
  const trimmed = text.trim().replace(/;+\s*$/u, "");
  if (!trimmed) {
    return false;
  }

  const primaryLine = firstMeaningfulStatement(trimmed);

  if (LINQ_PATTERN.test(primaryLine) || containsLinqMarkers(primaryLine)) {
    return false;
  }

  if (RAW_SQL_PATTERN.test(primaryLine)) {
    return true;
  }

  if (containsLinqMarkers(trimmed)) {
    return false;
  }

  for (const statement of enumerateSqlStatements(trimmed)) {
    const line = firstMeaningfulLine(stripLeadingSqlComments(statement));
    if (!line || isSqlPreambleLine(line)) {
      continue;
    }

    if (RAW_SQL_PATTERN.test(line)) {
      return true;
    }
  }

  return false;
}

function containsLinqMarkers(text: string): boolean {
  return (
    text.includes("=>") ||
    text.includes(".ToList") ||
    text.includes(".Where(") ||
    text.includes(".Select(") ||
    text.includes(".FromSql")
  );
}

export function isQueryLanguageBoundary(previousLine: string, nextLine: string): boolean {
  const previous = previousLine.trim();
  const next = nextLine.trim();

  if (!previous || !next) {
    return false;
  }

  const previousIsSql = looksLikeRawSql(previous);
  const nextIsSql = looksLikeRawSql(next);
  const previousIsLinq = !previousIsSql && looksLikeLinqLine(previous);
  const nextIsLinq = !nextIsSql && looksLikeLinqLine(next);

  return (previousIsSql && nextIsLinq) || (previousIsLinq && nextIsSql);
}

function looksLikeLinqLine(text: string): boolean {
  const trimmed = text.trim();

  return LINQ_PATTERN.test(trimmed) || containsLinqMarkers(trimmed);
}

export function resolveQueryEditorLanguage(text: string): "sql" | "csharp" {
  return looksLikeRawSql(text) ? "sql" : "csharp";
}
