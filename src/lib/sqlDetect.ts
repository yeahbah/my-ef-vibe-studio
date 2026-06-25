const RAW_SQL_PATTERN =
  /^(SELECT|WITH|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|MERGE|EXEC|EXECUTE|EXPLAIN|SHOW|DESCRIBE|DESC|PRAGMA|BEGIN|COMMIT|ROLLBACK|GRANT|REVOKE|USE)\b/iu;

const LINQ_PATTERN =
  /^(db\.|await\s|var\s|return\s|using\s|namespace\s|public\s|private\s)/iu;

export function looksLikeRawSql(text: string): boolean {
  const trimmed = text.trim().replace(/;+\s*$/u, "");
  if (!trimmed) {
    return false;
  }

  if (LINQ_PATTERN.test(trimmed)) {
    return false;
  }

  if (
    trimmed.includes("=>") ||
    trimmed.includes(".ToList") ||
    trimmed.includes(".Where(") ||
    trimmed.includes(".Select(") ||
    trimmed.includes(".FromSql")
  ) {
    return false;
  }

  return RAW_SQL_PATTERN.test(trimmed);
}
