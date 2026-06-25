export interface SqlToLinqResult {
  linq: string;
  confidence: "high" | "partial" | "low";
  unsupported: string[];
  mappings: Array<{ table: string; dbSet: string }>;
}

export function convertSqlToLinqDraft(sql: string): SqlToLinqResult {
  const trimmed = sql.trim().replace(/;+\s*$/u, "");
  const unsupported: string[] = [];
  const mappings: Array<{ table: string; dbSet: string }> = [];

  if (!trimmed) {
    return {
      linq: "",
      confidence: "low",
      unsupported: ["Empty SQL input"],
      mappings,
    };
  }

  if (/\bjoin\b/iu.test(trimmed)) {
    unsupported.push("JOIN clauses need manual navigation mapping");
  }

  if (/\bwith\b/iu.test(trimmed) && /^\s*with\b/iu.test(trimmed)) {
    unsupported.push("CTE (WITH) is not supported in draft conversion");
  }

  const fromMatch = /\bfrom\s+([^\s,;]+)/iu.exec(trimmed);
  if (!fromMatch) {
    return {
      linq: "// Could not find FROM clause — paste a simple SELECT query.",
      confidence: "low",
      unsupported: ["No FROM clause detected"],
      mappings,
    };
  }

  const table = fromMatch[1].replace(/^\[|\]$/gu, "").split(".").pop() ?? fromMatch[1];
  const dbSet = toDbSetName(table);
  mappings.push({ table, dbSet });

  let linq = `db.${dbSet}`;

  const whereMatch = /\bwhere\s+(.+?)(?:\border\s+by\b|\blimit\b|\boffset\b|\btop\b|$)/iu.exec(trimmed);
  if (whereMatch) {
    const predicate = whereMatch[1].trim();
    if (/=/.test(predicate) && !/\bor\b|\band\b|\(/iu.test(predicate)) {
      const [column, value] = predicate.split("=").map((part) => part.trim());
      linq += `.Where(x => x.${toPascalCase(column.split(".").pop() ?? column)} == ${formatSqlValue(value)})`;
    } else {
      unsupported.push(`WHERE clause needs manual rewrite: ${predicate}`);
      linq += "\n    // TODO: rewrite WHERE manually";
    }
  }

  const orderMatch = /\border\s+by\s+([^\s,;]+)(?:\s+(asc|desc))?/iu.exec(trimmed);
  if (orderMatch) {
    const column = orderMatch[1].split(".").pop() ?? orderMatch[1];
    const direction = orderMatch[2]?.toLowerCase() === "desc" ? "Descending" : "";
    linq += `.OrderBy${direction}(x => x.${toPascalCase(column)})`;
  }

  const topMatch = /\btop\s+(\d+)/iu.exec(trimmed);
  const limitMatch = /\blimit\s+(\d+)/iu.exec(trimmed);
  const take = topMatch?.[1] ?? limitMatch?.[1];
  if (take) {
    linq += `.Take(${take})`;
  }

  if (/\bselect\s+\*/iu.test(trimmed)) {
    linq += ".ToList();";
  } else if (/\bselect\b/iu.test(trimmed)) {
  linq += "\n    .Select(x => new { /* map columns */ })\n    .ToList();";
    unsupported.push("Projection columns need manual mapping in Select");
  } else {
    linq += ".ToList();";
  }

  const confidence =
    unsupported.length === 0 ? "high" : unsupported.length <= 2 ? "partial" : "low";

  return { linq, confidence, unsupported, mappings };
}

function toDbSetName(table: string): string {
  const cleaned = table.replace(/^\[|\]$/gu, "");
  if (cleaned.endsWith("s")) {
    return toPascalCase(cleaned);
  }

  return `${toPascalCase(cleaned)}s`;
}

function toPascalCase(value: string): string {
  const parts = value.replace(/^\[|\]$/gu, "").split(/[_\s]/u);
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join("");
}

function formatSqlValue(value: string): string {
  const cleaned = value.replace(/^'|'$/gu, "").replace(/^"|"$/gu, "");
  if (/^\d+(\.\d+)?$/u.test(cleaned)) {
    return cleaned;
  }

  return `"${cleaned}"`;
}
