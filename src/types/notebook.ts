export interface NotebookCell {
  id: string;
  kind: "code" | "markdown";
  value: string;
}

export interface EfvibeNotebookFile {
  version: 1;
  name: string;
  connectionId: string;
  cells: Array<{
    kind: "code" | "markdown";
    value: string;
  }>;
}

export function createNotebookCell(kind: "code" | "markdown" = "code", value = ""): NotebookCell {
  return {
    id: crypto.randomUUID(),
    kind,
    value,
  };
}

export function createDefaultNotebook(_connectionId?: string): NotebookCell[] {
  return [createNotebookCell("code", "db.Products.Take(10).ToList();")];
}
