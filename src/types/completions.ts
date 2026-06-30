import type { ConnectionSettings } from "./connection";

export interface CompletionJsonItem {
  label: string;
  insertText: string;
  kind: string;
  detail?: string;
}

export interface CompletionsJsonPayload {
  prefix: string;
  items: CompletionJsonItem[];
}

export interface EfvibeCompletionContext {
  connectionSettings: ConnectionSettings;
  searchDirectory: string;
  cwd: string;
}
