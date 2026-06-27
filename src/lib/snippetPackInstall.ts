import { applyImportedPack, fetchPackFromUrl } from "./pack";
import { REMOTE_SNIPPET_PACK_REGISTRY } from "./packRegistry";
import { BUILTIN_SNIPPET_PACKS } from "../types/snippetPacks";
import type { SnippetDefinition } from "../types/snippets";

export interface SnippetPackInstallCallbacks {
  onImportPack: (
    snippets: SnippetDefinition[],
    queries: Array<{ name: string; expression: string; connectionId: string }>,
    folderNames: string[],
  ) => void;
  onInstallPackId: (packId: string) => void;
  onStatus: (message: string) => void;
}

export async function installBuiltinSnippetPack(
  packId: string,
  connectionId: string,
  callbacks: SnippetPackInstallCallbacks,
): Promise<void> {
  const manifest = BUILTIN_SNIPPET_PACKS.find((entry) => entry.id === packId);
  if (!manifest) {
    return;
  }

  const applied = applyImportedPack(manifest.pack, connectionId);
  callbacks.onImportPack(applied.snippets, applied.queries, applied.folderNames);
  callbacks.onInstallPackId(packId);
  callbacks.onStatus(`Installed ${manifest.name}`);
}

export async function installRemoteSnippetPack(
  packId: string,
  connectionId: string,
  callbacks: SnippetPackInstallCallbacks,
): Promise<void> {
  const entry = REMOTE_SNIPPET_PACK_REGISTRY.find((pack) => pack.id === packId);
  if (!entry) {
    return;
  }

  const pack = await fetchPackFromUrl(entry.url);
  const applied = applyImportedPack(pack, connectionId);
  callbacks.onImportPack(applied.snippets, applied.queries, applied.folderNames);
  callbacks.onInstallPackId(entry.id);
  callbacks.onStatus(`Installed ${entry.name}`);
}

export async function installSnippetPackFromUrl(
  url: string,
  connectionId: string,
  callbacks: SnippetPackInstallCallbacks,
): Promise<void> {
  const pack = await fetchPackFromUrl(url);
  const applied = applyImportedPack(pack, connectionId);
  callbacks.onImportPack(applied.snippets, applied.queries, applied.folderNames);
  callbacks.onInstallPackId(`url:${url}`);
  callbacks.onStatus(`Installed ${pack.name}`);
}
