# MyEFvibe Studio

Standalone desktop app for EF Core LINQ exploration — a LINQPad-style scratchpad wired to your real `DbContext`, with translated SQL, query plans, and multi-project workspace management.

Built with **Tauri 2** + **React** + **Monaco**. The [efvibe](https://github.com/yeahbah/my-ef-vibe) CLI remains the evaluation engine; Studio is orchestration and UX.

## Phase 6 (current)

Polish, shipping, and Tier 2 depth. See **[docs/PHASE6_CHECKLIST.md](docs/PHASE6_CHECKLIST.md)** for tasks and exit criteria.

- **Compare & benchmark** — `#[Compare]` multi-variant runs and `#[Benchmark(N)]` in the Result tab; REPL `:compare` / `:benchmark` parity in Charts
- **Expression mode toggle** — expose lambda scratchpad mode in the toolbar
- **Query library UX** — folders, search, and organization in the Library panel
- **Aligned releases** — efvibe 0.6.26+ with Studio builds; website screenshots
- **Tier 2** — SQL→LINQ polish, two-connection diff, `workspace validate --json`

## Phase 5

- **Cloud sync** — push/pull favorite queries to a cloud-backed folder (Dropbox, iCloud, OneDrive); no credentials synced
- **Pack marketplace** — install snippet packs from a registry URL or any direct `.efvibe-pack` link
- **Scripts panel** — list, edit, and save `.csx` helpers; default `scripts/` search path beside workspace file
- **Session charts** — timing breakdown and benchmark bars in the Charts tool panel
- **Connection form** — dedicated connection editor (separate from global Settings)
- **Path pickers** — browse for folders and `.csproj` files in connection and settings forms

## Phase 4

- **Connection secret vault** — optional local vault for connection strings (kept out of `.efvibe-workspace` files)
- **Keybinding profiles** — customize Run, Run Plan, explorer toggle, and save-query shortcuts in Settings
- **Windows code signing** — release workflow signs MSI/NSIS when `WINDOWS_CERTIFICATE` secrets are configured

## Phase 3

- **Team panel** — git status and commit for `.efvibe-workspace` / `.efvibe-query` / `.efvibe-notebook` files
- **Team packs** — export/import `.efvibe-pack` (queries, snippets, folders)
- **Sync folder** — push/pull favorite queries to a shared directory (local team sync)
- **Snippet packs** — built-in marketplace packs (EF Core basics, performance probes)
- **Open in IDE** — scan findings open in VS Code, Rider, or Visual Studio (configured in Settings)
- **Engine SQL → LINQ** — `sqlToLinq` via daemon with ToQueryString validation (requires efvibe 0.6.13+)

See [INSTALL.md](INSTALL.md) for release build instructions.

See [docs/USER_GUIDE.md](docs/USER_GUIDE.md) for a full user guide (workspaces, queries, notebooks, sync, and troubleshooting).

See [docs/PHASE6_CHECKLIST.md](docs/PHASE6_CHECKLIST.md) for the current development backlog.

## Phase 2

- **Result explorer** — Dump-style nested object tree (Explorer tab) with grid/tree toggle
- **Live SQL pane** — debounced `ToQueryString()` preview beside the editor
- **SQL → LINQ draft** — rule-based converter dialog for simple SELECT queries
- **Query library** — favorites, folders, and search across open tabs
- **Snippets** — built-in EF snippets plus user-defined snippets
- **Lambda mode** — optional expression scratchpad (semicolon not required)
- **Compare baseline** — set baseline and diff against latest run in Charts panel

## Phase 1

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

## Supported platforms

| Platform | Support |
|----------|---------|
| Linux | x86_64 (`.deb`, `.rpm`, `.AppImage`) |
| Windows | x86_64 (`.msi`, `.exe`) |
| macOS | **Apple Silicon only** (`arm64`) — Intel Mac not supported |

See [INSTALL.md](INSTALL.md) for release downloads and macOS Gatekeeper notes.

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
| F5 | Run all (full editor) |
| Ctrl+Enter | Run current line |
| Ctrl+Shift+Enter | Run with plan |
| Ctrl+Tab | Next query tab |
| Ctrl+Shift+Tab | Previous query tab |
| Ctrl+Shift+T | New query tab |
| Ctrl+W | Close query tab |
| Ctrl+B | Toggle explorer sidebar |
| Ctrl+S | Save query tab (when bound to a file) |

## File formats

| Extension | Purpose |
|-----------|---------|
| `.efvibe-workspace` | Projects and connections |
| `.efvibe-query` | Single query tab (expression + connection) |
| `.efvibe-notebook` | Multi-cell notebook |
| `.efvibe-pack` | Team pack (queries + snippets + folders) |

## License

MyEFvibe Studio is **proprietary software**. Copyright © 2026 Yeahbah. All rights reserved.

See [LICENSE](LICENSE) for the full MyEFvibe Studio Software License Agreement (v1.1). Summary:

| Tier | Who | Limit |
|------|-----|-------|
| **Personal** | Individuals | Non-commercial use only |
| **Small team** | Organizations | Commercial use, up to **5 licensed developers** |
| **Commercial** | Organizations | **Per-seat license** required for 6+ developers |

A **Licensed Developer** is any individual who uses Studio to write, edit, run, or debug LINQ/SQL queries. Count unique people—not machines or concurrent sessions.

The bundled [efvibe](https://github.com/yeahbah/my-ef-vibe) CLI remains licensed under [Apache 2.0](https://github.com/yeahbah/my-ef-vibe/blob/main/LICENSE). Third-party open source dependencies used by Studio retain their respective licenses.
