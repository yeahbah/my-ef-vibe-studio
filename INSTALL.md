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

Every push to `main` runs CI (frontend build, Rust tests), then automatically:

1. Computes the next patch version (max of latest `v*` git tag, GitHub Releases, and `package.json` / Tauri manifests)
2. Creates and pushes a `v*` tag (e.g. `v0.2.5`)
3. The **Release** workflow builds Linux, macOS, and Windows installers and publishes a [GitHub Release](https://github.com/yeahbah/my-ef-vibe-studio/releases)

Version-bump commits from CI include `[skip ci]` so they do not trigger another release.

Manual release: **Actions → Release → Run workflow** (optional version input), or push a tag:

```bash
git tag v0.2.5
git push origin v0.2.5
```

The **Release** workflow publishes:

| Platform | Artifacts |
|----------|-----------|
| Linux | `.deb`, `.rpm`, `.AppImage` |
| macOS | `.dmg` (Apple Silicon only; Intel Mac not supported) |
| Windows | `.msi`, `.exe` |

You can also start a release manually from **Actions → Release → Run workflow** (optional version input; releases publish immediately by default).

**CI** runs on pushes and pull requests to `main`: frontend build, Rust tests, and (on `main` only) automatic version tagging when CI passes.

Download builds from [GitHub Releases](https://github.com/yeahbah/my-ef-vibe-studio/releases).

### macOS app users (DMG install)

The Studio `.dmg` does **not** include the .NET SDK or efvibe. Install them once:

```bash
# .NET SDK 8+ (https://dotnet.microsoft.com/download)
dotnet --version

# efvibe global tool
dotnet tool install --global efvibe

# Ensure tools are on PATH for Terminal (add to ~/.zprofile if needed)
export PATH="$PATH:$HOME/.dotnet/tools"
```

If Studio still reports prerequisites missing when launched from **Finder**, either:

1. Quit Studio and launch from Terminal: `open -a "MyEFvibe Studio"`, or
2. In Studio **Settings**, set **efvibe tool path** to the full path, e.g. `/Users/you/.dotnet/tools/efvibe` (run `which efvibe` in Terminal).

**CI note:** Release publishing needs `contents: write` for `GITHUB_TOKEN`. In the repo go to **Settings → Actions → General → Workflow permissions** and choose **Read and write permissions** (or keep read-only defaults and rely on the workflow `permissions` block in `.github/workflows/release.yml`).

## First run checklist

On first launch, Studio offers to **create a sample workspace** (AdventureWorks SQLite with starter query tabs — including a **C# program** demo — scripts, and a bundled database). Or start empty and:

1. Open or create a `.efvibe-workspace`
2. Set **search directory** (or EF project) so efvibe can discover your `.csproj`
3. Run a simple query: `db.Products.ToList();` — efvibe auto-limits unbounded materializers to **100 rows** (or use `.Take(n)` / `#[Unbounded]`). You can also open the sample **C# program** tab and press **Run all** (`F5`) to see console output and a return-value grid
4. Optional: configure **Open in IDE**, **team sync directory**, **keybindings**, and **connection secret vault** in Settings

Use a recent **efvibe** build (0.6.26+ recommended) so Studio can pass script session flags and receive separated `consoleOutput` in eval JSON.

### Connection secret vault

When **Store connection strings in the local secret vault** is enabled (default), connection strings are saved in a Tauri store (`connection-vault.json`) instead of your `.efvibe-workspace` file. Workspace files remain safe to commit; secrets stay on your machine.

### Windows code signing (maintainers)

Windows installers need an **Authenticode** certificate from a CA (DigiCert, Sectigo, etc.). An Apple Developer account does **not** cover Windows signing.

Add these repository secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|--------|
| `WINDOWS_CERTIFICATE` | Base64-encoded `.pfx` code-signing certificate |
| `WINDOWS_CERTIFICATE_PASSWORD` | PFX password |

Encode a PFX:

```bash
openssl base64 -A -in your-codesign.pfx -out windows-cert-base64.txt
```

When these secrets are absent, the release workflow skips signing. Signed builds reduce SmartScreen warnings for end users.

### macOS code signing and notarization (maintainers)

Release DMGs are **signed and notarized in CI** when the Apple secrets below are configured. Without them, builds are unsigned and users may see “damaged” or “unidentified developer” until quarantine is cleared (see Troubleshooting).

#### 1. Create a Developer ID Application certificate

1. On a Mac, open **Keychain Access → Certificate Assistant → Request a Certificate From a Certificate Authority** and save a CSR.
2. In [Apple Developer → Certificates](https://developer.apple.com/account/resources/certificates/list), create **Developer ID Application** (not “Apple Distribution” — that is for the Mac App Store).
3. Download the `.cer` and double-click to install it in your login keychain.

Find your signing identity:

```bash
security find-identity -v -p codesigning
```

Copy the full name, e.g. `Developer ID Application: Your Name (TEAMID1234)`.

#### 2. Export the certificate for CI

1. **Keychain Access → My Certificates** → expand your Developer ID Application entry.
2. Right-click the private key → **Export** → save as `.p12` with a password.
3. Base64-encode for GitHub (must be **one line**):

```bash
openssl base64 -A -in DeveloperID.p12 | pbcopy
```

Paste into the `APPLE_CERTIFICATE` secret with **no quotes** and no extra spaces. Do not use `base64` without `-A` unless you strip all newlines.

#### 3. App-specific password (for notarization)

1. Sign in at [appleid.apple.com](https://appleid.apple.com) → **App-Specific Passwords**.
2. Generate a password for “GitHub Actions notarization”.

#### 4. GitHub repository secrets

| Secret | Value |
|--------|--------|
| `APPLE_CERTIFICATE` | Contents of `apple-cert-base64.txt` (single line; use `openssl base64 -A`) |
| `APPLE_CERTIFICATE_PASSWORD` | Password used when exporting the `.p12` |
| `KEYCHAIN_PASSWORD` | Any strong random string (CI-only keychain) |
| `APPLE_SIGNING_IDENTITY` | Full identity from `security find-identity`, e.g. `Developer ID Application: …` |
| `APPLE_ID` | Your Apple ID email |
| `APPLE_PASSWORD` | App-specific password (not your Apple ID login password) |
| `APPLE_TEAM_ID` | Team ID from [Membership details](https://developer.apple.com/account#MembershipDetailsCard) |

**Password mix-up (common):**

| Secret | What it is |
|--------|------------|
| `APPLE_CERTIFICATE_PASSWORD` | Password you set when **exporting the `.p12`** from Keychain Access |
| `APPLE_PASSWORD` | **App-specific password** from appleid.apple.com (for notarization only) |
| `KEYCHAIN_PASSWORD` | Any random string you invent for the temporary CI keychain |

If CI reports `MAC verification failed during PKCS12 import`, `APPLE_CERTIFICATE_PASSWORD` is wrong. Re-export the `.p12`, pick a new password, update both `APPLE_CERTIFICATE` and `APPLE_CERTIFICATE_PASSWORD`, and re-run the workflow.

Test locally before updating GitHub:

```bash
security import DeveloperID.p12 -k ~/Library/Keychains/login.keychain-db -P 'your-export-password' -T /usr/bin/codesign
```

#### 5. Publish a signed release

Tag push (recommended):

```bash
git tag v0.2.1
git push origin v0.2.1
```

Or run **Actions → Release → Run workflow**, set a version, and optionally mark as draft.

The workflow builds `.dmg` (Apple Silicon), signs + notarizes on macOS, signs `.msi`/`.exe` on Windows when configured, and uploads everything to a GitHub Release.

#### Local signed DMG (optional)

With the certificate in your Mac keychain:

```bash
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)"
export APPLE_ID="you@example.com"
export APPLE_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="TEAMID"
npm run tauri build -- --target aarch64-apple-darwin
```

Output: `src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/*.dmg`

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
- **macOS says the app or DMG is “damaged”** — try these in order:

  **1. Clear download quarantine** (common after GitHub/browser download):
  ```bash
  xattr -cr ~/Downloads/*efvibe*.dmg
  open ~/Downloads/*efvibe*.dmg
  ```

  **2. Check whether the build was notarized** (maintainers). Mount the DMG, then:
  ```bash
  spctl -a -vv -t install "/Volumes/MyEFvibe Studio/MyEFvibe Studio.app"
  codesign -dv --verbose=4 "/Volumes/MyEFvibe Studio/MyEFvibe Studio.app"
  ```

  If `spctl` says `rejected` or `Unnotarized`, the GitHub release was **signed but not notarized**. Confirm all secrets are set:
  - `APPLE_SIGNING_IDENTITY`
  - `APPLE_ID`
  - `APPLE_PASSWORD` — must be an **app-specific password** from [appleid.apple.com](https://appleid.apple.com), not your Apple ID login password
  - `APPLE_TEAM_ID`

  Re-run the Release workflow after fixing secrets. Newer workflows also run a **Verify macOS signing and notarization** step that fails CI if notarization did not complete.

  **3. Unsigned workaround** (not recommended for distribution):
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
