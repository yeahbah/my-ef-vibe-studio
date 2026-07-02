import { describe, expect, it } from "vitest";
import { collectWorkspaceScopeDirectories } from "./fsScope";
import type { EfvibeWorkspace } from "../types/workspace";

describe("collectWorkspaceScopeDirectories", () => {
  it("includes workspace directory and project roots", () => {
    const workspace: EfvibeWorkspace = {
      version: 1,
      name: "Test",
      projects: [{ path: "C:/dev/MyApp/MyApp.csproj" }],
      connections: [
        {
          id: "conn-1",
          name: "Default",
          efProject: "C:/dev/MyApp/MyApp.csproj",
          startupProject: "C:/dev/MyApp.Web/MyApp.Web.csproj",
          context: "AppDbContext",
          searchDirectory: "C:/dev",
        },
      ],
    };

    expect(collectWorkspaceScopeDirectories("C:/workspaces/demo", workspace)).toEqual(
      expect.arrayContaining([
        "C:/workspaces/demo",
        "C:/dev/MyApp",
        "C:/dev/MyApp.Web",
        "C:/dev",
      ]),
    );
  });
});
