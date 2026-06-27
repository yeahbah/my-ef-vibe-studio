import { describe, expect, it } from "vitest";
import {
  escapeMarkdown,
  formatDbInfoMarkdown,
  formatTablesMarkdown,
  renderNotebookMarkdown,
} from "./notebookMarkdown";

describe("escapeMarkdown", () => {
  it("escapes pipes and newlines", () => {
    expect(escapeMarkdown("a|b\nc")).toBe("a\\|b c");
  });
});

describe("formatDbInfoMarkdown", () => {
  it("renders a table for dbinfo payloads", () => {
    const markdown = formatDbInfoMarkdown({
      dbContext: "AppDbContext",
      entries: [{ key: "Provider", value: "PostgreSQL" }],
    });

    expect(markdown).toContain("### DbInfo: AppDbContext");
    expect(markdown).toContain("| Provider | PostgreSQL |");
  });
});

describe("formatTablesMarkdown", () => {
  it("renders a table for tables payloads", () => {
    const markdown = formatTablesMarkdown({
      dbContext: "AppDbContext",
      tables: [{ dbSet: "Products", entityType: "Product" }],
    });

    expect(markdown).toContain("| Products | Product |");
  });
});

describe("renderNotebookMarkdown", () => {
  it("renders headings and paragraphs", () => {
    const html = renderNotebookMarkdown("### Title\nUse `db.Products`");
    expect(html).toContain("<h3>Title</h3>");
    expect(html).toContain("<p>Use `db.Products`</p>");
  });
});
