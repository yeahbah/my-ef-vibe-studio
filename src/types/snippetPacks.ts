import type { EfvibePack } from "./pack";

export interface SnippetPackManifest {
  id: string;
  name: string;
  description: string;
  author: string;
  pack: EfvibePack;
}

export const BUILTIN_SNIPPET_PACKS: SnippetPackManifest[] = [
  {
    id: "ef-core-basics",
    name: "EF Core basics",
    description: "Common DbSet queries for everyday exploration.",
    author: "MyEFvibe Studio",
    pack: {
      version: 1,
      kind: "snippet-pack",
      name: "EF Core basics",
      description: "Common DbSet queries for everyday exploration.",
      author: "MyEFvibe Studio",
      exportedAt: "2026-01-01T00:00:00.000Z",
      folders: [],
      snippets: [
        {
          title: "Count all",
          expression: "db.Products.Count();",
          description: "Count rows in a DbSet.",
        },
        {
          title: "Latest 20",
          expression: "db.Orders.OrderByDescending(o => o.OrderDate).Take(20).ToList();",
          description: "Recent rows ordered by date.",
        },
        {
          title: "Filter active",
          expression: "db.Products.Where(p => p.IsActive).ToList();",
          description: "Simple boolean filter.",
        },
        {
          title: "Include child",
          expression: "db.Orders.Include(o => o.OrderLines).Take(10).ToList();",
          description: "Eager load a collection navigation.",
        },
        {
          title: "SQL preview",
          expression: 'db.Products.Where(p => p.Name.Contains("Pro")).ToQueryString();',
          description: "Preview translated SQL without executing.",
        },
      ],
      queries: [],
    },
  },
  {
    id: "performance-probes",
    name: "Performance probes",
    description: "Queries that help spot translation and round-trip issues.",
    author: "MyEFvibe Studio",
    pack: {
      version: 1,
      kind: "snippet-pack",
      name: "Performance probes",
      description: "Queries that help spot translation and round-trip issues.",
      author: "MyEFvibe Studio",
      exportedAt: "2026-01-01T00:00:00.000Z",
      folders: [],
      snippets: [
        {
          title: "Count with filter",
          expression: 'db.Orders.Count(o => o.Status == "Shipped");',
          description: "Server-side count with predicate.",
        },
        {
          title: "Any exists",
          expression: "db.Customers.Any(c => c.Email != null);",
          description: "Existence check without materializing rows.",
        },
        {
          title: "Select projection",
          expression:
            "db.Products.Select(p => new { p.Id, p.Name }).Take(50).ToList();",
          description: "Narrow columns before materialization.",
        },
        {
          title: "Group count",
          expression:
            "db.Orders.GroupBy(o => o.Status).Select(g => new { g.Key, Count = g.Count() }).ToList();",
          description: "Aggregate on the server when possible.",
        },
      ],
      queries: [],
    },
  },
];
