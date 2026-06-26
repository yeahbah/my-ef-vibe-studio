import { open } from "@tauri-apps/plugin-dialog";

export async function pickFolder(defaultPath?: string): Promise<string | undefined> {
  const selected = await open({
    directory: true,
    multiple: false,
    defaultPath: defaultPath?.trim() || undefined,
  });

  if (!selected || Array.isArray(selected)) {
    return undefined;
  }

  return selected;
}

export async function pickCsprojFile(defaultPath?: string): Promise<string | undefined> {
  const selected = await open({
    multiple: false,
    filters: [{ name: "C# Project", extensions: ["csproj"] }],
    defaultPath: defaultPath?.trim() || undefined,
  });

  if (!selected || Array.isArray(selected)) {
    return undefined;
  }

  return selected;
}
