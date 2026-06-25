export interface SnippetDefinition {
  id: string;
  title: string;
  expression: string;
  description?: string;
  builtin?: boolean;
}

export const BUILTIN_SNIPPETS: SnippetDefinition[] = [
  {
    id: "take-10",
    title: "Take 10",
    expression: "db.Products.Take(10).ToList();",
    description: "Sample first 10 rows from a DbSet.",
    builtin: true,
  },
  {
    id: "count",
    title: "Count",
    expression: "db.Products.Count();",
    description: "Count rows in a DbSet.",
    builtin: true,
  },
  {
    id: "where-like",
    title: "Where contains",
    expression: 'db.Products.Where(p => p.Name.Contains("x")).ToList();',
    description: "Filter with string contains.",
    builtin: true,
  },
  {
    id: "include",
    title: "Include navigation",
    expression: "db.Orders.Include(o => o.Customer).Take(20).ToList();",
    description: "Eager-load a navigation property.",
    builtin: true,
  },
  {
    id: "group-by",
    title: "Group by",
    expression:
      "db.Orders.GroupBy(o => o.Status).Select(g => new { Status = g.Key, Count = g.Count() }).ToList();",
    description: "Aggregate with group by.",
    builtin: true,
  },
  {
    id: "to-query-string",
    title: "ToQueryString",
    expression: "db.Products.Where(p => p.Id > 0).ToQueryString();",
    description: "Preview translated SQL without executing.",
    builtin: true,
  },
];

export function createUserSnippet(title: string, expression: string): SnippetDefinition {
  return {
    id: crypto.randomUUID(),
    title,
    expression,
    builtin: false,
  };
}
