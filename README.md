# efvibe Studio

Standalone desktop app for EF Core LINQ exploration — a LINQPad-style scratchpad wired to your real `DbContext`, with translated SQL, query plans, and multi-project workspace management.

Built with **Tauri 2** + **React** + **Monaco**. The [efvibe](https://github.com/yeahbah/my-ef-vibe) CLI remains the evaluation engine; Studio is orchestration and UX.

## Phase 0 (current)

- Tauri 2 shell with Monaco query editor
- `.efvibe-workspace` open/save
- Single connection: Run / Run Plan with Result, SQL, Plan, and Messages tabs
- Rust daemon bridge spawning `efvibe serve` (ported from `vscode-extension/src/daemonClient.ts`)
- Prerequisites check (.NET SDK + efvibe)
- Settings page and **Open in IDE** hook (VS Code, Rider, Visual Studio, custom)

See the full product plan in [my-ef-vibe/docs/efvibe-studio-plan.md](https://github.com/yeahbah/my-ef-vibe/blob/main/docs/efvibe-studio-plan.md).

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- Linux desktop deps for Tauri: `webkit2gtk` and `rsvg2` ([Tauri prerequisites](https://tauri.app/start/prerequisites/))
- [.NET SDK](https://dotnet.microsoft.com/download) 8+
- [efvibe](https://www.nuget.org/packages/efvibe) on PATH or in repo `dotnet-tools.json`

```bash
dotnet tool install --global efvibe
```

## Development

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

## Workspace format

`.efvibe-workspace` files describe projects and EF connections:

```json
{
  "version": 1,
  "name": "AdventureWorks Lab",
  "projects": [
    { "path": "../AdventureWorks/apps/api-dotnet/src/AdventureWorks.API" }
  ],
  "connections": [
    {
      "id": "aw-dev",
      "name": "AW Dev",
      "efProject": "../AdventureWorks/.../Persistence.csproj",
      "startupProject": "../AdventureWorks/.../API.csproj",
      "context": "AdventureWorksDbContext"
    }
  ]
}
```

An example file lives at `examples/sample.efvibe-workspace`.

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Enter | Run query |

## License

Apache 2.0 (engine compatibility with efvibe). Studio UI licensing TBD.
