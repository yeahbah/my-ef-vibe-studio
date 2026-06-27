import { mkdir, readDir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

export interface ScriptFileEntry {
  name: string;
  path: string;
  configured: boolean;
}

const SCRIPT_EXTENSION = ".csx";

export function isScriptFileName(name: string): boolean {
  return name.toLowerCase().endsWith(SCRIPT_EXTENSION);
}

export function normalizeScriptDirectory(scriptSearchPath: string): string {
  return scriptSearchPath.trim().replace(/\\/g, "/").replace(/\/$/, "");
}

export function scriptFileNameFromLoad(loadPath: string): string {
  const trimmed = loadPath.trim();
  const segments = trimmed.split(/[/\\]/);
  return segments[segments.length - 1] ?? trimmed;
}

export function joinScriptPath(scriptSearchPath: string, fileName: string): string {
  return `${normalizeScriptDirectory(scriptSearchPath)}/${fileName}`;
}

export async function listScriptFiles(
  scriptSearchPath: string,
  configuredLoads: string[] = [],
): Promise<ScriptFileEntry[]> {
  const directory = normalizeScriptDirectory(scriptSearchPath);
  if (!directory) {
    return [];
  }

  const configuredNames = new Set(
    configuredLoads
      .map(scriptFileNameFromLoad)
      .filter(Boolean)
      .map((name) => name.toLowerCase()),
  );

  const files = new Map<string, ScriptFileEntry>();

  try {
    const entries = await readDir(directory);
    for (const entry of entries) {
      if (!entry.isFile || !isScriptFileName(entry.name)) {
        continue;
      }

      files.set(entry.name.toLowerCase(), {
        name: entry.name,
        path: joinScriptPath(directory, entry.name),
        configured: configuredNames.has(entry.name.toLowerCase()),
      });
    }
  } catch {
    // Directory may not exist yet; configured loads can still appear below.
  }

  for (const load of configuredLoads) {
    const fileName = scriptFileNameFromLoad(load);
    if (!fileName || !isScriptFileName(fileName)) {
      continue;
    }

    const key = fileName.toLowerCase();
    if (!files.has(key)) {
      files.set(key, {
        name: fileName,
        path: joinScriptPath(directory, fileName),
        configured: true,
      });
    }
  }

  return [...files.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export async function readScriptContent(path: string): Promise<string> {
  return readTextFile(path);
}

export async function writeScriptContent(path: string, content: string): Promise<void> {
  const payload = content.endsWith("\n") ? content : `${content}\n`;
  await writeTextFile(path, payload);
}

export async function createScriptFile(scriptSearchPath: string, fileName: string): Promise<string> {
  const directory = normalizeScriptDirectory(scriptSearchPath);
  let name = fileName.trim();
  if (!name) {
    throw new Error("Script name is required.");
  }

  if (!isScriptFileName(name)) {
    name = `${name}${SCRIPT_EXTENSION}`;
  }

  await mkdir(directory, { recursive: true });
  const path = joinScriptPath(directory, name);
  await writeScriptContent(path, "// EF query helpers\n");
  return path;
}
