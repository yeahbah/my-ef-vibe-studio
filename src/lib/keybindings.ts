import type { KeybindingSettings } from "../types/keybindings";

export interface ParsedKeybinding {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
}

export function parseKeybinding(binding: string): ParsedKeybinding | undefined {
  const parts = binding
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return undefined;
  }

  const parsed: ParsedKeybinding = {
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
    key: "",
  };

  for (const part of parts) {
    const normalized = part.toLowerCase();
    if (normalized === "ctrl" || normalized === "control" || normalized === "cmdorctrl") {
      parsed.ctrl = true;
      continue;
    }

    if (normalized === "shift") {
      parsed.shift = true;
      continue;
    }

    if (normalized === "alt" || normalized === "option") {
      parsed.alt = true;
      continue;
    }

    if (normalized === "meta" || normalized === "cmd" || normalized === "command") {
      parsed.meta = true;
      continue;
    }

    parsed.key = part;
  }

  if (!parsed.key) {
    return undefined;
  }

  return parsed;
}

export function matchesKeybinding(event: KeyboardEvent, binding: string): boolean {
  const parsed = parseKeybinding(binding);
  if (!parsed) {
    return false;
  }

  const key = normalizeKey(event.key);
  const expected = normalizeKey(parsed.key);

  if (key !== expected) {
    return false;
  }

  const wantsCtrl = parsed.ctrl || parsed.meta;
  const hasCtrl = event.ctrlKey || event.metaKey;

  return (
    hasCtrl === wantsCtrl &&
    event.shiftKey === parsed.shift &&
    event.altKey === parsed.alt &&
    (parsed.meta ? event.metaKey : true)
  );
}

export function keybindingLabel(binding: string): string {
  return binding.replace(/CmdOrCtrl/gi, "Ctrl");
}

export function resolveKeybindings(
  settings?: Partial<KeybindingSettings>,
): KeybindingSettings {
  return {
    runQuery: settings?.runQuery?.trim() || "Ctrl+Enter",
    runPlan: settings?.runPlan?.trim() || "Ctrl+Shift+Enter",
    toggleExplorer: settings?.toggleExplorer?.trim() || "Ctrl+B",
    saveQuery: settings?.saveQuery?.trim() || "Ctrl+S",
    nextQueryTab: settings?.nextQueryTab?.trim() || "Ctrl+Tab",
    previousQueryTab: settings?.previousQueryTab?.trim() || "Ctrl+Shift+Tab",
    newQueryTab: settings?.newQueryTab?.trim() || "Ctrl+Shift+T",
    closeQueryTab: settings?.closeQueryTab?.trim() || "Ctrl+F4",
  };
}

function normalizeKey(key: string): string {
  if (key === " ") {
    return "space";
  }

  return key.toLowerCase();
}

export function keybindingToMonacoChord(
  binding: string,
  KeyMod: { CtrlCmd: number; Shift: number; Alt: number },
  KeyCode: Record<string, number>,
): number | undefined {
  const parsed = parseKeybinding(binding);
  if (!parsed) {
    return undefined;
  }

  const code = monacoKeyCode(parsed.key, KeyCode);
  if (code === undefined) {
    return undefined;
  }

  let chord = code;
  if (parsed.ctrl || parsed.meta) {
    chord |= KeyMod.CtrlCmd;
  }
  if (parsed.shift) {
    chord |= KeyMod.Shift;
  }
  if (parsed.alt) {
    chord |= KeyMod.Alt;
  }

  return chord;
}

function monacoKeyCode(key: string, KeyCode: Record<string, number>): number | undefined {
  const normalized = normalizeKey(key);

  const aliases: Record<string, string> = {
    enter: "Enter",
    return: "Enter",
    esc: "Escape",
    escape: "Escape",
    space: "Space",
    tab: "Tab",
    backspace: "Backspace",
    delete: "Delete",
    up: "UpArrow",
    down: "DownArrow",
    left: "LeftArrow",
    right: "RightArrow",
  };

  const resolved = aliases[normalized] ?? (normalized.length === 1 ? normalized.toUpperCase() : key);
  const code = KeyCode[resolved];

  return typeof code === "number" ? code : undefined;
}
