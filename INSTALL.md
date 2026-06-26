# Installing efvibe Studio

efvibe Studio is a Tauri desktop app. You need the **efvibe** CLI on your PATH (or configured in Settings) for query execution.

## Prerequisites

- Node.js 20+
- Rust stable
- Linux desktop deps: `webkit2gtk`, `gtk3`, `rsvg2` ([Tauri prerequisites](https://tauri.app/start/prerequisites/))
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
| Linux | `.deb`, `.AppImage`, `.rpm` |
| macOS | `.dmg`, `.app` |
| Windows | `.msi`, `.exe` (NSIS) |

## CI/CD and GitHub Releases

GitHub Actions builds installers on every version tag:

```bash
git tag v0.2.0
git push origin v0.2.0
```

The **Release** workflow publishes:

| Platform | Artifacts |
|----------|-----------|
| Linux | `.deb`, `.rpm`, `.AppImage` |
| macOS | `.dmg` (Apple Silicon) |
| Windows | `.msi`, `.exe` |

You can also start a release manually from **Actions → Release → Run workflow** (optional version input; releases publish immediately by default).

**CI** runs on pushes and pull requests to `main`: frontend build plus `cargo check` for the Tauri backend.

Download builds from [GitHub Releases](https://github.com/yeahbah/my-ef-vibe-studio/releases).

**CI note:** Release publishing needs `contents: write` for `GITHUB_TOKEN`. In the repo go to **Settings → Actions → General → Workflow permissions** and choose **Read and write permissions** (or keep read-only defaults and rely on the workflow `permissions` block in `.github/workflows/release.yml`).

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

- **Wrong icon in taskbar or app menu (Linux)** — older RPM/deb builds installed icons under invalid `hicolor` paths. Upgrade to **v0.2.2+**, or after install run:
  ```bash
  sudo gtk-update-icon-cache -f /usr/share/icons/hicolor
  update-desktop-database /usr/share/applications
  ```
  Then log out and back in (or restart Plasma).
- **AppImage crashes on launch (segmentation fault)** — common with WebKitGTK on NVIDIA / some Wayland setups. Ubuntu-built AppImages also require a `lib → usr/lib` layout for WebKit helper processes; Studio creates that symlink automatically at startup on recent builds. v0.2.1+ sets graphics workarounds automatically. For older builds try:
  ```bash
  WEBKIT_DISABLE_DMABUF_RENDERER=1 ./efvibe.Studio_0.2.0_amd64.AppImage
  ```
  On **Fedora / Nobara**, prefer the `.rpm` package — it uses your system WebKit and is more reliable than the Ubuntu-built AppImage. To re-enable the faster GPU path if your machine is unaffected: `WEBKIT_DISABLE_DMABUF_RENDERER=0 ./efvibe.Studio_….AppImage`
- **Prerequisites banner** — confirms `dotnet` and `efvibe` are reachable from the search directory.
- **Save/Open dialogs** — Tauri FS scopes include home, documents, desktop, and downloads.
- **Git commit in Team panel** — requires a git repo; only efvibe file types are listed by default.
