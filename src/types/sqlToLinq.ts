export interface SqlToLinqMapping {
  table: string;
  dbSet: string;
  entity: string;
}

export interface SqlToLinqResult {
  linq: string;
  confidence: "high" | "partial" | "low";
  unsupported: string[];
  mappings: SqlToLinqMapping[];
  translatedSql?: string;
  similarity?: number;
}

export const EMPTY_SQL_TO_LINQ_RESULT: SqlToLinqResult = {
  linq: "",
  confidence: "low",
  unsupported: [],
  mappings: [],
};
