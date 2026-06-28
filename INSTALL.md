# Installing MyEFvibe Studio

MyEFvibe Studio is a Tauri desktop app. You need the **efvibe** CLI on your PATH (or configured in Settings) for query execution.

## Supported platforms

| Platform | Support |
|----------|---------|
| **Linux** | x86_64 — `.deb`, `.rpm`, `.AppImage` |
| **Windows** | x86_64 — `.msi`, `.exe` (NSIS) |
| **macOS** | **Apple Silicon only** (`arm64`, M1 and later) — `.dmg` |

Intel Macs are **not** supported. There is no x86_64 macOS release.

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
| macOS | `.dmg`, `.app` (Apple Silicon / `arm64` only) |
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
| macOS | `.dmg` (Apple Silicon only; Intel Mac not supported) |
| Windows | `.msi`, `.exe` |

You can also start a release manually from **Actions → Release → Run workflow** (optional version input; releases publish immediately by default).

**CI** runs on pushes and pull requests to `main`: frontend build plus `cargo check` for the Tauri backend.

Download builds from [GitHub Releases](https://github.com/yeahbah/my-ef-vibe-studio/releases).

**CI note:** Release publishing needs `contents: write` for `GITHUB_TOKEN`. In the repo go to **Settings → Actions → General → Workflow permissions** and choose **Read and write permissions** (or keep read-only defaults and rely on the workflow `permissions` block in `.github/workflows/release.yml`).

## First run checklist

1. Open or create a `.efvibe-workspace`
2. Set **search directory** (or EF project) so efvibe can discover your `.csproj`
3. Run a simple query: `db.Products.Take(5).ToList();`
4. Optional: configure **Open in IDE**, **team sync directory**, **keybindings**, and **connection secret vault** in Settings

### Connection secret vault

When **Store connection strings in the local secret vault** is enabled (default), connection strings are saved in a Tauri store (`connection-vault.json`) instead of your `.efvibe-workspace` file. Workspace files remain safe to commit; secrets stay on your machine.

### Windows code signing (maintainers)

To sign Windows installers in CI, add repository secrets:

| Secret | Value |
|--------|--------|
| `WINDOWS_CERTIFICATE` | Base64-encoded `.pfx` code-signing certificate |
| `WINDOWS_CERTIFICATE_PASSWORD` | PFX password |

When these secrets are absent, the release workflow skips signing. Signed builds reduce SmartScreen warnings for end users.

### macOS code signing (maintainers)

Release DMGs are **unsigned and not notarized**. Users may see “damaged” or “unidentified developer” until quarantine is cleared (see Troubleshooting). Proper fix: Apple Developer ID signing + notarization in CI.

### Cloud sync

Configure **Cloud sync directory** in Settings to a folder backed by Dropbox, iCloud Drive, Google Drive, or similar. Use **Push to cloud sync** / **Pull from cloud sync** in the Team explorer context menu. Only queries and packs are synced — never connection strings.

### Snippet packs

Built-in packs ship offline. Registry packs under **Team → Snippet packs** download the latest JSON from GitHub on install. Use **Install pack from URL…** for any hosted `.efvibe-pack` file.

## Engine features used by Studio

| Studio feature | efvibe surface |
|----------------|----------------|
| Run / Run Plan | `efvibe serve` → `eval` |
| Schema / scan | `tables`, `describe`, `scan` |
| Live SQL | `eval` with `ToQueryString()` probe |
| SQL → LINQ | `serve` → `sqlToLinq` or `efvibe sql-to-linq --sql ... --format json` |

## Troubleshooting

- **Wrong icon in taskbar or app menu (Linux)** — KDE Wayland matches the taskbar icon using the app’s `app_id` and the `.desktop` file’s `StartupWMClass` (must be `com.yeahbah.efvibe-studio` in current builds). After upgrading or reinstalling the RPM:
  ```bash
  sudo gtk-update-icon-cache -f /usr/share/icons/hicolor
  sudo update-desktop-database /usr/share/applications
  kbuildsycoca6 --noincremental
  ```
  Then log out and back in (or restart Plasma). If you still see the generic Wayland icon, fully quit Studio and launch it from the app menu (not an old pinned taskbar entry).
- **macOS says the app or DMG is “damaged”** — the file is usually fine. GitHub release builds are **not Apple-notarized** yet, and Safari/Chrome attach a quarantine flag that Gatekeeper treats as broken. Try:
  1. Remove quarantine, then open the DMG:
     ```bash
     xattr -cr ~/Downloads/efvibe*.dmg
     open ~/Downloads/efvibe*.dmg
     ```
  2. Drag **MyEFvibe Studio** to Applications, then clear quarantine on the app:
     ```bash
     xattr -cr "/Applications/MyEFvibe Studio.app"
     ```
  3. First launch: **right-click** the app → **Open** → **Open** (bypasses the one-time unidentified-developer block).
  If it still fails, check **System Settings → Privacy & Security** for an **Open Anyway** button after the first blocked launch.
- **AppImage crashes on launch (segmentation fault)** — common with WebKitGTK on NVIDIA / some Wayland setups. Ubuntu-built AppImages also require a `lib → usr/lib` layout for WebKit helper processes; Studio creates that symlink automatically at startup on recent builds. v0.2.1+ sets graphics workarounds automatically. For older builds try:
  ```bash
  WEBKIT_DISABLE_DMABUF_RENDERER=1 ./efvibe.Studio_0.2.0_amd64.AppImage
  ```
  On **Fedora / Nobara**, prefer the `.rpm` package — it uses your system WebKit and is more reliable than the Ubuntu-built AppImage. To re-enable the faster GPU path if your machine is unaffected: `WEBKIT_DISABLE_DMABUF_RENDERER=0 ./efvibe.Studio_….AppImage`
- **Prerequisites banner** — confirms `dotnet` and `efvibe` are reachable from the search directory.
- **Save/Open dialogs** — Tauri FS scopes include home, documents, desktop, and downloads.
- **Git commit in Team panel** — requires a git repo; only efvibe file types are listed by default.
