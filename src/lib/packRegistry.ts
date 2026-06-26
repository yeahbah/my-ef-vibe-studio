export interface RemotePackEntry {
  id: string;
  name: string;
  description: string;
  author: string;
  url: string;
}

const REGISTRY_BASE =
  "https://raw.githubusercontent.com/yeahbah/my-ef-vibe-studio/main/packs";

/** Community packs fetched on install (latest from the registry URL). */
export const REMOTE_SNIPPET_PACK_REGISTRY: RemotePackEntry[] = [
  {
    id: "ef-core-basics-remote",
    name: "EF Core basics (registry)",
    description: "Common DbSet queries — latest from GitHub.",
    author: "efvibe Studio",
    url: `${REGISTRY_BASE}/ef-core-basics.efvibe-pack`,
  },
  {
    id: "performance-probes-remote",
    name: "Performance probes (registry)",
    description: "Translation and round-trip probes — latest from GitHub.",
    author: "efvibe Studio",
    url: `${REGISTRY_BASE}/performance-probes.efvibe-pack`,
  },
];
