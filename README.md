# efvibe Studio

Standalone desktop app for EF Core LINQ exploration — a LINQPad-style scratchpad wired to your real `DbContext`, with translated SQL, query plans, and multi-project workspace management.

Built with **Tauri 2** + **React** + **Monaco**. The [efvibe](https://github.com/yeahbah/my-ef-vibe) CLI remains the evaluation engine; Studio is orchestration and UX.

## Phase 1 (current)

- **Query tabs** — multiple `.efvibe-query` tabs with per-tab connection binding
- **Connection manager** — add, edit, duplicate connections in the sidebar
- **Schema explorer** — list DbSets; Count, Sample, and Describe actions
- **Scan** — lite/deep scan with review UI (findings from `efvibe scan`)
- **History** — recent evaluations with click-to-restore
- **Notebooks** — open/save `.efvibe-notebook`, run all cells
- **REPL** — opens `efvibe repl` in your system terminal
- Session persistence for tabs, sidebar, history, and notebook state

## Phase 0

- Tauri 2 shell with Monaco query editor
- `.efvibe-workspace` open/save
- Run / Run Plan with Result, SQL, Plan, and Messages tabs
- Rust daemon bridge spawning `efvibe serve`
- Prerequisites check (.NET SDK + efvibe)
- Settings page and **Open in IDE** hook (VS Code, Rider, Visual Studio, custom)
- Resizable results dock

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
| Ctrl+S | Save query tab (when bound to a file) |

## File formats

| Extension | Purpose |
|-----------|---------|
| `.efvibe-workspace` | Projects and connections |
| `.efvibe-query` | Single query tab (expression + connection) |
| `.efvibe-notebook` | Multi-cell notebook |

## License

Apache 2.0 (engine compatibility with efvibe). Studio UI licensing TBD.
