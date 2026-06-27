import type { DbInfoJsonPayload, TablesJsonPayload } from "../types/schema";
import { escapeHtml } from "./resultFormat";

export function escapeMarkdown(value: string | undefined | null): string {
  return (value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

export function formatDbInfoMarkdown(payload: DbInfoJsonPayload | undefined): string {
  if (!payload) {
    return "Could not load `:dbinfo`.";
  }

  const rows = payload.entries
    .map((entry) => `| ${escapeMarkdown(entry.key)} | ${escapeMarkdown(entry.value ?? "")} |`)
    .join("\n");

  return `### DbInfo: ${escapeMarkdown(payload.dbContext)}\n\n| Key | Value |\n|---|---|\n${rows}`;
}

export function formatTablesMarkdown(payload: TablesJsonPayload | undefined): string {
  if (!payload) {
    return "Could not load `:tables`.";
  }

  const rows = payload.tables
    .map((entry) => `| ${escapeMarkdown(entry.dbSet)} | ${escapeMarkdown(entry.entityType)} |`)
    .join("\n");

  return `### Tables: ${escapeMarkdown(payload.dbContext)}\n\n| DbSet | Entity |\n|---|---|\n${rows}`;
}

/** Minimal markdown → HTML for notebook cells and command output. */
export function renderNotebookMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const parts: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (index < lines.length && lines[index].startsWith("|")) {
        tableLines.push(lines[index]);
        index += 1;
      }
      parts.push(renderMarkdownTable(tableLines));
      continue;
    }

    if (line.startsWith("### ")) {
      parts.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`);
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      parts.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`);
      index += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      parts.push(`<h1>${inlineMarkdown(line.slice(2))}</h1>`);
      index += 1;
      continue;
    }

    parts.push(`<p>${inlineMarkdown(line)}</p>`);
    index += 1;
  }

  return parts.join("\n");
}

function renderMarkdownTable(lines: string[]): string {
  if (lines.length === 0) {
    return "";
  }

  const rows = lines
    .filter((line) => !/^\|\s*[-:]+\s*\|/u.test(line))
    .map((line) =>
      line
        .trim()
        .replace(/^\|/u, "")
        .replace(/\|$/u, "")
        .split("|")
        .map((cell) => cell.trim()),
    );

  if (rows.length === 0) {
    return "";
  }

  const [head, ...body] = rows;
  const headerCells = head.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join("");
  const bodyRows = body
    .map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`)
    .join("");

  return `<table class="notebook-md-table"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
}

function inlineMarkdown(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}
