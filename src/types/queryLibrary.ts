export interface QueryFolder {
  id: string;
  name: string;
}

export interface SavedQueryRef {
  id: string;
  name: string;
  expression: string;
  connectionId: string;
  folderId?: string;
  favorite?: boolean;
  filePath?: string;
}

export interface QueryLibraryState {
  folders: QueryFolder[];
  queries: SavedQueryRef[];
}

export function createEmptyQueryLibrary(): QueryLibraryState {
  return { folders: [], queries: [] };
}

export function createQueryFolder(name: string): QueryFolder {
  return { id: crypto.randomUUID(), name };
}

export function queryTabToSavedRef(
  tab: { id: string; name: string; expression: string; connectionId: string; filePath: string },
  folderId?: string,
  favorite = false,
): SavedQueryRef {
  return {
    id: tab.id,
    name: tab.name,
    expression: tab.expression,
    connectionId: tab.connectionId,
    folderId,
    favorite,
    filePath: tab.filePath || undefined,
  };
}
