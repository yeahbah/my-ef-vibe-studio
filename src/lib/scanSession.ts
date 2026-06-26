import { mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import {
  getDbContextSessionDirectory,
  getProjectScanDirectory,
} from "./sessionPaths";
import type { ConnectionSettings } from "../types/connection";
import type { ScanFindingDto, ScanMode } from "../types/scan";

export const SCAN_DISMISSALS_FILE_NAME = "myefvibe-scan-dismissals.json";
export const SCAN_NOTES_FILE_NAME = "myefvibe-scan-notes.json";

interface ScanDismissalEntry {
  key: string;
  filePath: string;
  line: number;
  ruleId: string;
  note?: string;
  dismissedAt: string;
}

interface ScanDismissalsDocument {
  version: number;
  dismissals: ScanDismissalEntry[];
}

interface ScanNoteEntry {
  key: string;
  filePath: string;
  line: number;
  ruleId: string;
  note: string;
  updatedAt: string;
}

interface ScanNotesDocument {
  version: number;
  notes: ScanNoteEntry[];
}

export function getScanSessionDirectory(
  settings: ConnectionSettings,
  mode: ScanMode,
): string {
  if (mode === "deep") {
    return getDbContextSessionDirectory(
      settings.workspaceRoot,
      settings.project,
      settings.context || "DbContext",
    );
  }

  return getProjectScanDirectory(settings.workspaceRoot, settings.project);
}

export function getFindingDismissalKey(finding: ScanFindingDto): string {
  return `${finding.filePath}|${finding.line}|${finding.ruleId}`;
}

export async function dismissScanFinding(
  sessionDirectory: string,
  finding: ScanFindingDto,
  note?: string,
): Promise<void> {
  await mkdir(sessionDirectory, { recursive: true });

  const filePath = `${sessionDirectory}/${SCAN_DISMISSALS_FILE_NAME}`;
  const document = await loadDismissalsDocument(filePath);
  const key = getFindingDismissalKey(finding);
  const trimmedNote = note?.trim();

  document.dismissals = document.dismissals.filter((entry) => entry.key !== key);
  document.dismissals.push({
    key,
    filePath: finding.filePath,
    line: finding.line,
    ruleId: finding.ruleId,
    note: trimmedNote || undefined,
    dismissedAt: new Date().toISOString(),
  });

  await writeTextFile(filePath, `${JSON.stringify(document, null, 2)}\n`);
}

export async function saveScanFindingNote(
  sessionDirectory: string,
  finding: ScanFindingDto,
  note: string,
): Promise<void> {
  const trimmed = note.trim();
  if (!trimmed) {
    throw new Error("Note text is required.");
  }

  await mkdir(sessionDirectory, { recursive: true });

  const filePath = `${sessionDirectory}/${SCAN_NOTES_FILE_NAME}`;
  const document = await loadNotesDocument(filePath);
  const key = getFindingDismissalKey(finding);

  document.notes = document.notes.filter((entry) => entry.key !== key);
  document.notes.push({
    key,
    filePath: finding.filePath,
    line: finding.line,
    ruleId: finding.ruleId,
    note: trimmed,
    updatedAt: new Date().toISOString(),
  });

  await writeTextFile(filePath, `${JSON.stringify(document, null, 2)}\n`);
}

export async function loadSavedNotesMap(sessionDirectory: string): Promise<Record<string, string>> {
  const filePath = `${sessionDirectory}/${SCAN_NOTES_FILE_NAME}`;
  const document = await loadNotesDocument(filePath);

  return Object.fromEntries(
    document.notes
      .filter((entry) => entry.note.trim())
      .map((entry) => [entry.key, entry.note]),
  );
}

async function loadDismissalsDocument(filePath: string): Promise<ScanDismissalsDocument> {
  try {
    const raw = await readTextFile(filePath);
    const parsed = JSON.parse(raw) as ScanDismissalsDocument;
    return {
      version: parsed.version ?? 1,
      dismissals: Array.isArray(parsed.dismissals) ? parsed.dismissals : [],
    };
  } catch {
    return { version: 1, dismissals: [] };
  }
}

async function loadNotesDocument(filePath: string): Promise<ScanNotesDocument> {
  try {
    const raw = await readTextFile(filePath);
    const parsed = JSON.parse(raw) as ScanNotesDocument;
    return {
      version: parsed.version ?? 1,
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
    };
  } catch {
    return { version: 1, notes: [] };
  }
}
