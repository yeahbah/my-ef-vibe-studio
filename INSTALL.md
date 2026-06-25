# Installing efvibe Studio

efvibe Studio is a Tauri desktop app. You need the **efvibe** CLI on your PATH (or configured in Settings) for query execution.

## Prerequisites

- Node.js 20+
- Rust stable
- Linux desktop deps: `webkit2gtk`, `rsvg2` ([Tauri prerequisites](https://tauri.app/start/prerequisites/))
- .NET SDK 8+
- [efvibe](https://www.nuget.org/packages/efvibe) 0.6.13+ (for engine-backed SQL → LINQ)

```bash
dotnet tool install --global efvibe
# or use a local build from https://github.com/yeahbah/my-ef-vibe
```

## Development

```bash
npm install
npm run tauri dev
```

## Release build

```bash
npm run tauri build
```

Artifacts are written under `src-tauri/target/release/bundle/`:

| Platform | Typical artifact |
|----------|------------------|
| Linux | `.deb`, `.AppImage`, or `.rpm` (depends on host) |
| macOS | `.dmg`, `.app` |
| Windows | `.msi`, `.exe` |

## First run checklist

1. Open or create a `.efvibe-workspace`
2. Set **search directory** (or EF project) so efvibe can discover your `.csproj`
3. Run a simple query: `db.Products.Take(5).ToList();`
4. Optional: configure **Open in IDE** and **team sync directory** in Settings

## Engine features used by Studio

| Studio feature | efvibe surface |
|----------------|----------------|
| Run / Run Plan | `efvibe serve` → `eval` |
| Schema / scan | `tables`, `describe`, `scan` |
| Live SQL | `eval` with `ToQueryString()` probe |
| SQL → LINQ | `serve` → `sqlToLinq` or `efvibe sql-to-linq --sql ... --format json` |

## Troubleshooting

- **Prerequisites banner** — confirms `dotnet` and `efvibe` are reachable from the search directory.
- **Save/Open dialogs** — Tauri FS scopes include home, documents, desktop, and downloads.
- **Git commit in Team panel** — requires a git repo; only efvibe file types are listed by default.
