export interface TablesJsonEntry {
  dbSet: string;
  entityType: string;
  entityTypeFullName?: string;
}

export interface TablesJsonPayload {
  dbContext: string;
  tables: TablesJsonEntry[];
}

export interface DescribeJsonMember {
  name: string;
  type: string;
  nullable: string;
  notes?: string;
}

export interface DescribeJsonPayload {
  success: boolean;
  dbSet?: string;
  entityType?: string;
  entityTypeFullName?: string;
  members?: DescribeJsonMember[];
  error?: string;
  knownEntities?: string[];
}

export interface DbInfoJsonEntry {
  key: string;
  value?: string;
}

export interface DbInfoJsonPayload {
  dbContext: string;
  entries: DbInfoJsonEntry[];
}

export interface DiagramJsonPayload {
  success: boolean;
  dbContext: string;
  format: "mermaid";
  dbSet?: string;
  entityType?: string;
  content?: string;
  error?: string;
  knownEntities?: string[];
}
