# Signed Windows installer and macOS DMG

Signed release builds are wired up in **my-ef-vibe-studio**. Here is what you need and how to run it.

## What you need

| Platform | Certificate | Your Apple account helps? |
|----------|-------------|---------------------------|
| **macOS (.dmg)** | **Developer ID Application** + notarization | Yes |
| **Windows (.msi/.exe)** | **Authenticode** `.pfx` from DigiCert, Sectigo, etc. | No — separate purchase |

## macOS setup (you have Apple Developer)

1. **Create certificate** — [Apple Developer → Certificates](https://developer.apple.com/account/resources/certificates/list) → **Developer ID Application** (not Mac App Store “Apple Distribution”).
2. **Export `.p12`** from Keychain Access (certificate + private key).
3. **App-specific password** — [appleid.apple.com](https://appleid.apple.com) → App-Specific Passwords.
4. **Add GitHub secrets** (repo → Settings → Secrets → Actions):

| Secret | Value |
|--------|--------|
| `APPLE_CERTIFICATE` | `openssl base64 -A -in DeveloperID.p12` |
| `APPLE_CERTIFICATE_PASSWORD` | `.p12` export password |
| `KEYCHAIN_PASSWORD` | any strong random string |
| `APPLE_SIGNING_IDENTITY` | e.g. `Developer ID Application: Your Name (TEAMID)` from `security find-identity -v -p codesigning` |
| `APPLE_ID` | your Apple ID email |
| `APPLE_PASSWORD` | app-specific password |
| `APPLE_TEAM_ID` | from [Membership details](https://developer.apple.com/account#MembershipDetailsCard) |

## Windows setup (if you want signed MSI)

| Secret | Value |
|--------|--------|
| `WINDOWS_CERTIFICATE` | base64-encoded `.pfx` |
| `WINDOWS_CERTIFICATE_PASSWORD` | PFX password |

Encode a PFX:

```bash
openssl base64 -A -in your-codesign.pfx -out windows-cert-base64.txt
```

## Publish

```bash
cd my-ef-vibe-studio
git tag v0.2.1
git push origin v0.2.1
```

Or use **Actions → Release → Run workflow**.

The workflow will:

- **macOS** — import cert, sign + notarize the DMG during `tauri build`
- **Windows** — sign `.msi` and `.exe` after build (when secrets are set)
- Upload everything to a GitHub Release

## Local signed DMG (optional)

```bash
export APPLE_SIGNING_IDENTITY="Developer ID Application: …"
export APPLE_ID="you@example.com"
export APPLE_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="TEAMID"
npm run tauri build -- --target aarch64-apple-darwin
```

DMG output: `src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/`

## Related files in this repo

| File | Purpose |
|------|---------|
| `.github/workflows/release.yml` | Release CI (signing env vars on macOS build) |
| `.github/scripts/import-apple-certificate.sh` | Imports Apple `.p12` into CI keychain |
| `.github/scripts/sign-windows.ps1` | Authenticode signing for `.msi` / `.exe` |
| `src-tauri/entitlements.plist` | macOS hardened-runtime entitlements |
| `INSTALL.md` | Full install + maintainer signing reference |
