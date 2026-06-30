import { runDaemonJson } from "./daemonClient";
import type { ConnectionSettings } from "../types/connection";
import type {
  CompletionJsonItem,
  CompletionsJsonPayload,
  EfvibeCompletionContext,
} from "../types/completions";

let cachedItems: CompletionJsonItem[] | undefined;
let cacheKey = "";

export function readDbPrefix(linePrefix: string): string | undefined {
  const match = /(?:^|[^\w])((?:db)(?:\.[\w]*)*)$/u.exec(linePrefix);
  return match?.[1];
}

export function completionReplaceRange(
  prefix: string,
  lineNumber: number,
  column: number,
): { startLineNumber: number; endLineNumber: number; startColumn: number; endColumn: number } {
  const partial = prefix.includes(".") ? prefix.slice(prefix.lastIndexOf(".") + 1) : "";

  return {
    startLineNumber: lineNumber,
    endLineNumber: lineNumber,
    startColumn: Math.max(1, column - partial.length),
    endColumn: column,
  };
}

function parseJsonLine<T>(stdout: string): T | undefined {
  const line = stdout
    .split(/\r?\n/u)
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("{"));

  if (!line) {
    return undefined;
  }

  try {
    return JSON.parse(line) as T;
  } catch {
    return undefined;
  }
}

export async function fetchCompletions(
  settings: ConnectionSettings,
  searchDirectory: string,
  cwd: string,
  prefix: string,
): Promise<CompletionJsonItem[]> {
  const key = `${settings.project}|${settings.context}|${prefix}`;

  if (cacheKey === key && cachedItems) {
    return cachedItems;
  }

  try {
    const line = await runDaemonJson(settings, searchDirectory, cwd, {
      type: "completions",
      prefix,
    });
    const payload = parseJsonLine<CompletionsJsonPayload>(line);
    cachedItems = payload?.items ?? [];
    cacheKey = key;
    return cachedItems;
  } catch {
    return [];
  }
}

export function invalidateCompletionCache(): void {
  cachedItems = undefined;
  cacheKey = "";
}

let activeCompletionContext: EfvibeCompletionContext | undefined;

export function setActiveCompletionContext(context: EfvibeCompletionContext | undefined): void {
  if (
    context?.connectionSettings.project !== activeCompletionContext?.connectionSettings.project
    || context?.connectionSettings.context !== activeCompletionContext?.connectionSettings.context
  ) {
    invalidateCompletionCache();
  }

  activeCompletionContext = context;
}

export function getActiveCompletionContext(): EfvibeCompletionContext | undefined {
  return activeCompletionContext;
}
