# efvibe Studio — User Guide

efvibe Studio is a desktop LINQ scratchpad for Entity Framework Core. It runs real queries against your project's `DbContext`, shows translated SQL and execution plans, and helps you explore schema, scan for performance issues, and share queries with your team.

This guide covers day-to-day use of the Studio app. For installation and release builds, see [INSTALL.md](../INSTALL.md). For the underlying CLI and REPL commands, see the [efvibe features](https://github.com/yeahbah/my-ef-vibe/blob/main/features.md) document.

---

## Table of contents

1. [Before you start](#before-you-start)
2. [First session](#first-session)
3. [The workspace layout](#the-workspace-layout)
4. [Connections](#connections)
5. [Query view](#query-view)
6. [Editor tools](#editor-tools)
7. [Explorer sidebar](#explorer-sidebar)
8. [ER Diagram view](#er-diagram-view)
9. [Notebook view](#notebook-view)
10. [REPL view](#repl-view)
11. [Team sharing and sync](#team-sharing-and-sync)
12. [Settings](#settings)
13. [File formats](#file-formats)
14. [Keyboard shortcuts](#keyboard-shortcuts)
15. [Tips and troubleshooting](#tips-and-troubleshooting)

---

## Before you start

### Prerequisites

- **.NET SDK 8+**
- **efvibe** CLI on your PATH (or configured in Settings)

```bash
dotnet tool install --global efvibe
```

Studio spawns `efvibe serve` in the background to evaluate queries. If prerequisites are missing, a banner at the top of the window explains what to install.

### Supported platforms

| Platform | Support |
|----------|---------|
| Linux | x86_64 (`.deb`, `.rpm`, `.AppImage`) |
| Windows | x86_64 (`.msi`, `.exe`) |
| macOS | Apple Silicon only (`arm64`) |

---

## First session

1. **Open or create a workspace** — use the sidebar toolbar: **New**, **Open**, or **Save** for `.efvibe-workspace` files.
2. **Configure a connection** — under **Connections** in the explorer, right-click a connection and choose **Edit…**. Set at least a **search directory** (folder containing your solution) so efvibe can discover `.csproj` files.
3. **Run a query** — switch to the **Query** view, enter something like `db.Products.Take(5).ToList();`, and press **Run** (or `Ctrl+Enter`).
4. **Inspect results** — use the **Result**, **SQL**, **Plan**, and **Messages** tabs in the results panel below the editor.

Your session (open tabs, history, notebook state, panel sizes) is restored when you reopen Studio.

---

## The workspace layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Connection bar · Main view tabs · Run bar · Status bar           │
├──────────┬──────────────────────────────────────────────────────┤
│ Explorer │  Query tabs / Notebook / Diagram / REPL               │
│ sidebar  │  ┌──────┬─────────────────────────┬──────────────┐  "│
│          │  │ Tool │  Editor                 │  Live SQL    │  │
│          │  │ rail │                         │  preview     │  │
│          │  └──────┴─────────────────────────┴──────────────┘  │
│          │  Results panel (Result ·  SQL / Plan / Messages)     │
└──────────┴──────────────────────────────────────────────────────┘
```

### Main views

Use the tabs at the top of the editor area:

| View | Purpose |
|------|---------|
| **Query** | Primary LINQ editor with results dock |
| **ER Diagram** | Mermaid entity-relationship diagram for the active connection |
| **Notebook** | Multi-cell scratchpad saved as `.efvibe-notebook` |
| **REPL** | Embedded interactive `efvibe repl` session |

Toggle the explorer sidebar with **Ctrl+B** (customizable in Settings).

---

## Connections

Each workspace can define multiple **connections**. A connection tells efvibe which EF project to build, which startup project supplies configuration, and which `DbContext` to use.

Open the connection editor by right-clicking a connection in the explorer and choosing **Edit…**.

| Field | Maps to efvibe flag | Notes |
|-------|---------------------|-------|
| Search directory | (discovery root) | Folder where efvibe searches for `.csproj` files |
| EF project | `-p` | Optional; auto-discovered when empty |
| Startup project | `-s` | Supplies user secrets and `appsettings` |
| DbContext | `-c` | Optional; auto-discovered when empty |
| Connection string override | `--connection-string` | Optional manual override |
| .NET framework | | Target framework hint (e.g. `net10.0`) |
| Show SQL in daemon logs | `--dblog` | Toggle executed SQL logging |

### Script session (per connection)

Optional helpers loaded into every evaluation for that connection:

- **Script search path** — folder for `#load` resolution
- **Script loads** — `.csx` files loaded at session start
- **Additional usings** — extra namespaces imported into the scripting session

You can also use `#load` directly in a query tab for one-off scripts.

### Connection secrets

When **Store connection strings in the local secret vault** is enabled in Settings, connection strings are kept out of `.efvibe-workspace` files and stored in a local vault instead.

### Connection actions (explorer context menu)

- **Activate** — switch the active connection
- **Refresh** — restart the efvibe daemon for the connection
- **Rebuild** — force a fresh `dotnet build`
- **DB Info** — show provider, connection, and server metadata
- **ER Diagram** — open the diagram view
- **Edit… / Duplicate / Delete** — manage connection definitions

---

## Query view

### Query tabs

- Open multiple query tabs; each can bind to a connection and optionally a `.efvibe-query` file.
- Use the tab bar **Open** and **Save** buttons (or `Ctrl+S`) to work with query files.
- Star a tab to add it to **Favorites** in the editor tools panel.

### Running queries

| Action | How |
|--------|-----|
| **Run** | Run bar button or `Ctrl+Enter` |
| **Run Plan** | Run bar button or `Ctrl+Shift+Enter` |
| **Stop** | Status bar stop button while a query is running |

Write LINQ against the global **`db`** variable (your active `DbContext`). End statements with a semicolon when running full C# snippets, for example:

```csharp
db.Products.Where(p => p.Name.Contains("Helmet")).Take(10).ToList();
```

You can also paste repository-style code; efvibe normalizes common patterns (`await`, `DbContext` → `db`, async terminals, and similar) before evaluation.

### Results panel

After each run, inspect output in four tabs:

| Tab | Contents |
|-----|----------|
| **Result** | Tabular data, scalar values, or an object tree |
| **SQL** | Translated and executed SQL |
| **Plan** | Query execution plan (when Run Plan was used) |
| **Messages** | Warnings and errors |

**Result** view features:

- **Grid / Tree toggle** — flat table or nested Dump-style object explorer
- **# column** — row numbers in the grid
- **Export** — CSV or JSON when the result is tabular
- **Save to database** — edit grid cells and persist changes back to the database when the query returned tracked entity rows with primary keys

Timing metrics (total ms, database ms, row count) appear in the results header.

### Live SQL preview

Toggle the **Linq/Sql** pane on the right edge of the editor. It shows:

- **LINQ → SQL** — debounced `ToQueryString()` preview as you type
- **SQL → LINQ** — paste SQL to get a draft LINQ expression (requires efvibe 0.6.13+)

Drag the divider between editor and SQL pane to resize.

---

## Editor tools

Click icons on the vertical tool rail to the left of the query editor.

### Charts

Session timing visualizations:

- Recent query timings (bar chart)
- Last run breakdown (total vs database vs app/Roslyn)
- Benchmark results after running **Benchmark** from the tool rail

### History

Recent evaluations from the last **7 days**, grouped by date (**Today**, **Yesterday**, then weekday labels). **Today** is expanded by default. Click an entry to restore its expression into the active query tab.

### Snippets

Two expandable sections:

**Snippets** — built-in EF snippets plus your custom snippets. Click a snippet to insert it into the editor. Use **Add snippet…** to create custom entries; remove custom snippets with the × button.

**Snippet packs** — install curated packs (built-in and registry entries) with **Install** / **Installed**. Use **Install from URL…** for a direct `.efvibe-pack` link.

Built-in snippets include common patterns such as `Take 10`, `Count`, `Include navigation`, `Group by`, and `ToQueryString`.

### Favorites

Starred query tabs. Open a favorite to switch to that tab, or remove the star from here.

### Scan

Run **Lite** or **Deep** LINQ performance scans (same engine as the efvibe CLI `:scan lite` / `:scan deep`):

- **Lite** — static Roslyn analysis of EF project sources
- **Deep** — lite rules plus `ToQueryString()` and plan probes using the live `DbContext`

Review findings one at a time. For each finding you can:

- Jump to source in your IDE (configured in Settings)
- Run the adapted expression in the query editor
- Dismiss or add a note (persisted for future scans)

### Benchmark

Runs the current query multiple times (default 5) and shows per-iteration timings in the **Charts** panel.

---

## Explorer sidebar

The explorer organizes your workspace into sections.

### Workspace

- **New / Open / Save** — workspace file operations (toolbar icons)
- Right-click the workspace root for **Properties**, **Rename**, and **Show in file manager**

### Connections → Model

Expand a connection to load its EF model. DbSets appear as child nodes.

Right-click a **DbSet**:

| Action | Effect |
|--------|--------|
| **Query** | Open a sample query tab for that DbSet |
| **ER Diagram** | Open diagram filtered to that entity |
| **Properties** | Show entity column and navigation details |

### Queries

Organize query tabs into **folders**. Right-click **Queries** to create a new folder. Right-click a query tab entry to open it, toggle favorite, or move it to a folder.

### Team

Collaboration tools (right-click **Team**):

| Action | Description |
|--------|-------------|
| **Export team pack** | Save queries, snippets, and folders to `.efvibe-pack` |
| **Import team pack** | Load a pack from disk |
| **Push favorites to sync folder** | Write favorites to the configured team sync directory |
| **Pull pack from sync folder** | Import from team sync directory |
| **Push to cloud sync** | Push favorite queries to cloud sync folder (Dropbox, iCloud, OneDrive, etc.) |
| **Pull from cloud sync** | Pull queries and pack manifest from cloud sync |

**Git** (under Team) shows changed `.efvibe-workspace`, `.efvibe-query`, and `.efvibe-notebook` files. Select files and **Commit selected…** to commit from Studio.

> Connection strings are never included in packs or cloud sync.

---

## ER Diagram view

A Mermaid entity-relationship diagram for the active connection's model.

- Open from the main view switcher, a connection context menu, or a DbSet context menu
- Filter by table/entity using the dropdown or by opening from a specific DbSet
- Useful for understanding relationships before writing LINQ

---

## Notebook view

A multi-cell scratchpad for exploratory work, saved as `.efvibe-notebook`.

### Toolbar

| Button | Action |
|--------|--------|
| **Run all** | Execute all code cells in order |
| **+ Code / + Markdown** | Append a new cell at the end |
| **Open** | Open a notebook file |
| **Save** | Save to the current path (prompts if unsaved) |
| **Save as…** | Always choose a new file location |

Edit the notebook title in the name field at the top.

### Cell types

**Code cells** — C# LINQ, raw SQL, or efvibe commands:

- LINQ: `db.Products.Take(10)`
- SQL: paste a `SELECT` statement
- Commands: `:dbinfo`, `:tables` (lines starting with `:`)

**Markdown cells** — documentation and notes. Click rendered markdown to edit; blur to preview.

### Running cells

Each code cell has run controls in the left gutter:

| Control | Action |
|---------|--------|
| Run above | Execute runnable code cells above this one |
| Run (play) | Run this cell (`Ctrl+Enter` in the cell editor) |
| Run below | Execute runnable code cells below this one |

Cell output appears inline below the editor (results, SQL, warnings, or markdown tables for command cells).

### Cell footer actions

| Action | Effect |
|--------|--------|
| **Add above / Add below** | Insert a new cell of the same kind (code or markdown) |
| **Move up / Move down** | Reorder cells |
| **Delete** | Remove the cell (at least one cell remains) |

Notebooks remember the connection used when saved. Opening a notebook restores its cells and connection binding.

---

## REPL view

An embedded terminal running `efvibe repl` for the active connection.

- Type `:help` inside the REPL for the full command list
- Use **Open external terminal** to launch the same session in your system terminal
- The REPL supports cumulative scripting (`var`, multi-line input, history, `:scan`, `:plan`, and more) — see [efvibe features](https://github.com/yeahbah/my-ef-vibe/blob/main/features.md)

---

## Team sharing and sync

### Team packs (`.efvibe-pack`)

Export/import bundles of:

- Query tabs (expressions and names)
- User snippets
- Query library folders

Use **Team → Export team pack** / **Import team pack** in the explorer.

### Sync folder

Set **Team sync directory** in Settings. **Push favorites to sync folder** writes favorite queries for teammates; **Pull pack from sync folder** imports their shared pack.

### Cloud sync

Set **Cloud sync directory** to a folder synced by Dropbox, iCloud, OneDrive, or similar. Push/pull favorite queries without sharing credentials.

### Git integration

When your workspace is inside a git repository, Studio lists changed efvibe files under **Team → Git** and supports committing selected files.

---

## Settings

Open Settings from the explorer footer (gear icon).

### Application

| Setting | Purpose |
|---------|---------|
| efvibe tool path | Override PATH / `dotnet-tools.json` discovery |
| Default workspace root | Default `-w` location for efvibe sessions |
| Open in IDE | VS Code, Rider, Visual Studio, or custom command for scan "go to source" |
| Team sync directory | Shared folder for team pack push/pull |
| Cloud sync directory | Cloud-backed folder for favorite query sync |
| Connection secret vault | Keep connection strings out of workspace files |

### Keybindings

Customize shortcuts for **Run query**, **Run plan**, **Toggle explorer**, and **Save query**. Use `Ctrl` or `Cmd` with `+` (for example `Ctrl+Enter`).

---

## File formats

| Extension | Purpose |
|-----------|---------|
| `.efvibe-workspace` | Projects, connections, and workspace metadata |
| `.efvibe-query` | Single saved query (name, connection, expression) |
| `.efvibe-notebook` | Multi-cell notebook (code + markdown, optional cached outputs) |
| `.efvibe-pack` | Team pack (queries, snippets, folders) |

Example workspace structure:

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

See `examples/sample.efvibe-workspace` in the Studio repository.

---

## Keyboard shortcuts

Default bindings (customizable in Settings):

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Run query (or run notebook cell when focused) |
| `Ctrl+Shift+Enter` | Run with plan |
| `Ctrl+S` | Save query tab |
| `Ctrl+B` | Toggle explorer sidebar |

In-app **Help** (sidebar footer) lists your current bindings.

---

## Tips and troubleshooting

### "Configure a connection before running"

Add a connection, set its **search directory**, and ensure the active connection is selected in the connection bar.

### Wrong connection string or SSPI errors (SQL Server on macOS/Linux)

Point the **startup project** (`-s`) at your API/web host — not the persistence library. Store Docker SQL credentials in that project's user secrets or `appsettings.Development.json`.

### efvibe not found

Install the global tool (`dotnet tool install --global efvibe`) or set **efvibe tool path** in Settings to your local build.

### Daemon / engine busy

Studio waits for the efvibe daemon to finish building and loading your `DbContext`. The status bar shows progress. Use **Refresh** or **Rebuild** on the connection if the model gets out of date.

### Scan deep failures on some call sites

Deep scan adapts repository code for the REPL, but expressions that depend on runtime parameters or complex locals may fail translation. The finding still appears with a note.

### macOS Gatekeeper

If the downloaded app is blocked, see [INSTALL.md](../INSTALL.md) for Gatekeeper notes.

### More documentation

- [Studio README](../README.md) — development and feature overview
- [efvibe CLI features](https://github.com/yeahbah/my-ef-vibe/blob/main/features.md) — REPL commands, scan rules, providers
- [myefvibe.com/docs](https://myefvibe.com/docs/) — product documentation site

---

## Quick reference: writing LINQ in Studio

```csharp
// Count rows
db.Products.Count();

// Filter and project
db.Orders
  .Where(o => o.Total > 100)
  .Select(o => new { o.Id, o.Total })
  .Take(20)
  .ToList();

// Preview SQL without executing
db.Products.Where(p => p.Id > 0).ToQueryString();

// Include related data
db.Orders.Include(o => o.Customer).Take(10).ToList();
```

For REPL-style exploration with charts, benchmarks, exports, and advanced diagnostics, switch to the **REPL** view and use `:help`.
