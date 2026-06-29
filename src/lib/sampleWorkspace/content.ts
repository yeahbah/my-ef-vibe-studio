export const SAMPLE_CONNECTION_ID = "sample-adventureworks-sqlite";
export const SAMPLE_WORKSPACE_NAME = "AdventureWorks SQLite";
export const SAMPLE_REPO_FOLDER = "AdventureWorks-sqlite";
export const SAMPLE_STUDIO_FOLDER = "studio";

export const SAMPLE_EF_PROJECT =
  "../apps/api-dotnet/src/AdventureWorks.Infrastructure.Persistence/AdventureWorks.Infrastructure.Persistence.csproj";
export const SAMPLE_STARTUP_PROJECT =
  "../apps/api-dotnet/src/AdventureWorks.API/AdventureWorks.API.csproj";

export interface SampleScriptFile {
  fileName: string;
  content: string;
}

export interface SampleQuerySpec {
  name: string;
  fileName: string;
  expression: string;
}

export const SAMPLE_SCRIPT_FILES: SampleScriptFile[] = [
  {
    fileName: "constants.csx",
    content: `const int DefaultTake = 25;
const decimal MinListPrice = 0m;
`,
  },
  {
    fileName: "helpers.csx",
    content: `public record ProductSummaryDto
{
    public int ProductId { get; init; }
    public string? Name { get; init; }
    public decimal ListPrice { get; init; }
}
`,
  },
  {
    fileName: "product-filters.csx",
    content: `#load "constants.csx"

using AdventureWorks.Domain.Entities.Production;

Expression<Func<Product, bool>> IsActiveProduct =
    p => !p.DiscontinuedDate.HasValue && p.ListPrice > MinListPrice;

IQueryable<Product> ActiveProducts() =>
    db.Products.Where(IsActiveProduct);
`,
  },
];

export const SAMPLE_QUERIES: SampleQuerySpec[] = [
  {
    name: "LINQ method syntax",
    fileName: "01-linq-method-syntax.efvibe-query",
    expression: `db.Products
  .Where(p => p.ListPrice > MinListPrice)
  .OrderBy(p => p.Name)
  .Take(10)
  .ToList();`,
  },
  {
    name: "LINQ query syntax",
    fileName: "02-linq-query-syntax.efvibe-query",
    expression: `from product in db.Products
where product.ListPrice > MinListPrice
orderby product.Name
select product;`,
  },
  {
    name: "Fluent helper query",
    fileName: "03-fluent-helper.efvibe-query",
    expression: `ActiveProducts()
  .OrderBy(p => p.Name)
  .Take(DefaultTake)
  .Select(p => new ProductSummaryDto
  {
    ProductId = p.ProductId,
    Name = p.Name,
    ListPrice = p.ListPrice,
  })
  .ToList();`,
  },
  {
    name: "Raw SQL",
    fileName: "04-raw-sql.efvibe-query",
    expression: `SELECT p.ProductID, p.Name, p.ListPrice
FROM Production.Product AS p
WHERE p.DiscontinuedDate IS NULL
  AND p.ListPrice > 0
ORDER BY p.Name
LIMIT 10;`,
  },
  {
    name: "Compare variants",
    fileName: "05-compare.efvibe-query",
    expression: `#[Compare("With tracking")]
ActiveProducts()
  .OrderBy(p => p.Name)
  .Take(10)
  .Select(p => new { p.ProductId, p.Name, p.ListPrice })
  .ToList();

#[Compare("No tracking")]
ActiveProducts()
  .AsNoTracking()
  .OrderBy(p => p.Name)
  .Take(10)
  .Select(p => new { p.ProductId, p.Name, p.ListPrice })
  .ToList();`,
  },
  {
    name: "Benchmark",
    fileName: "06-benchmark.efvibe-query",
    expression: `#[Benchmark(10)]
ActiveProducts()
  .AsNoTracking()
  .OrderBy(p => p.Name)
  .Take(10)
  .Select(p => new { p.ProductId, p.Name, p.ListPrice })
  .ToList();`,
  },
];

export const SAMPLE_NOTEBOOK = {
  name: "Getting started",
  fileName: "getting-started.efvibe-notebook",
  cells: [
    {
      kind: "markdown" as const,
      value: `# AdventureWorks sample notebook

This notebook uses the same script session as the workspace connection:
\`constants.csx\`, \`product-filters.csx\`, and \`helpers.csx\`.

Run cells with **Run cell** or **Run all**.`,
    },
    {
      kind: "code" as const,
      value: `:dbinfo`,
    },
    {
      kind: "code" as const,
      value: `db.Products.Take(5).Select(p => new { p.ProductId, p.Name }).ToList();`,
    },
    {
      kind: "code" as const,
      value: `from product in ActiveProducts()
orderby product.Name
select new ProductSummaryDto
{
  ProductId = product.ProductId,
  Name = product.Name,
  ListPrice = product.ListPrice,
};`,
    },
    {
      kind: "markdown" as const,
      value: `Open the **Compare** and **Benchmark** query tabs, then use **Run all** (\`F5\`) to see multi-variant and timed results.`,
    },
  ],
};

export function buildSampleWorkspaceJson(connectionId: string): string {
  const workspace = {
    version: 1,
    name: SAMPLE_WORKSPACE_NAME,
    projects: [],
    connections: [
      {
        id: connectionId,
        name: "AdventureWorks SQLite",
        efProject: SAMPLE_EF_PROJECT,
        startupProject: SAMPLE_STARTUP_PROJECT,
        context: "",
        dotnetFramework: "net10.0",
        dbLog: true,
        scriptSearchPath: "scripts",
        scriptLoads: ["constants.csx", "product-filters.csx", "helpers.csx"],
        scriptUsings: [
          "AdventureWorks.Domain.Entities.Production",
          "System.Linq.Expressions",
        ],
      },
    ],
  };

  return `${JSON.stringify(workspace, null, 2)}\n`;
}
