const MAX_QUERY_TAB_NAME_LENGTH = 120;

export function normalizeQueryTabName(name: string, fallback = "Query"): string {
  const trimmed = name.trim().slice(0, MAX_QUERY_TAB_NAME_LENGTH);
  return trimmed || fallback;
}
