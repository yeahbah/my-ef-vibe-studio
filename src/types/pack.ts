export interface PackQuery {
  name: string;
  expression: string;
  description?: string;
  folder?: string;
  favorite?: boolean;
}

export interface EfvibePack {
  version: 1;
  kind: "team-pack" | "snippet-pack";
  name: string;
  description?: string;
  author?: string;
  exportedAt: string;
  snippets: Array<{
    title: string;
    expression: string;
    description?: string;
  }>;
  queries: PackQuery[];
  folders: Array<{ name: string }>;
}

export function createPack(
  name: string,
  kind: EfvibePack["kind"],
  options?: Partial<Pick<EfvibePack, "description" | "author" | "snippets" | "queries" | "folders">>,
): EfvibePack {
  return {
    version: 1,
    kind,
    name,
    description: options?.description,
    author: options?.author,
    exportedAt: new Date().toISOString(),
    snippets: options?.snippets ?? [],
    queries: options?.queries ?? [],
    folders: options?.folders ?? [],
  };
}
