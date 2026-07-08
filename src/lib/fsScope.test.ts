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

  it("resolves parent-relative project paths against the workspace directory", () => {
    const workspace: EfvibeWorkspace = {
      version: 1,
      name: "AdventureWorks SQLite",
      projects: [],
      connections: [
        {
          id: "sample",
          name: "AdventureWorks SQLite",
          efProject:
            "../apps/api-dotnet/src/AdventureWorks.Infrastructure.Persistence/AdventureWorks.Infrastructure.Persistence.csproj",
          startupProject:
            "../apps/api-dotnet/src/AdventureWorks.API/AdventureWorks.API.csproj",
          context: "",
        },
      ],
    };

    expect(
      collectWorkspaceScopeDirectories(
        "/Users/dev/samples/AdventureWorks-sqlite/studio",
        workspace,
      ),
    ).toEqual(
      expect.arrayContaining([
        "/Users/dev/samples/AdventureWorks-sqlite/studio/../apps/api-dotnet/src/AdventureWorks.Infrastructure.Persistence",
        "/Users/dev/samples/AdventureWorks-sqlite/studio/../apps/api-dotnet/src/AdventureWorks.API",
        "/Users/dev/samples/AdventureWorks-sqlite/studio/scripts",
      ]),
    );
  });
});
