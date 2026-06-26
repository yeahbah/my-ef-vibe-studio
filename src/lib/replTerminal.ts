import { invoke } from "@tauri-apps/api/core";
import type { ConnectionSettings } from "../types/connection";

export interface ReplSpawnSpec {
  program: string;
  args: string[];
  cwd: string;
}

export async function fetchReplSpawnSpec(
  settings: ConnectionSettings,
  searchDirectory: string,
  cwd: string,
): Promise<ReplSpawnSpec> {
  return invoke<ReplSpawnSpec>("repl_spawn_spec", {
    settings,
    searchDirectory,
    cwd,
  });
}

export function replSpawnKey(spec: ReplSpawnSpec): string {
  return `${spec.program}\0${spec.cwd}\0${spec.args.join("\0")}`;
}
