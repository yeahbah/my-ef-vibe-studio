#!/usr/bin/env bash
# Fail the release if the macOS app is not signed and notarized.
set -euo pipefail

if [[ -z "${APPLE_SIGNING_IDENTITY:-}" ]]; then
  echo "APPLE_SIGNING_IDENTITY not set; skipping macOS signing verification."
  exit 0
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_PATH="$(find "$ROOT/src-tauri/target" -type d -path '*/bundle/macos/*.app' | head -n 1)"

if [[ -z "$APP_PATH" ]]; then
  echo "No .app bundle found under src-tauri/target for signing verification." >&2
  exit 1
fi

echo "Verifying macOS app: $APP_PATH"

echo "--- codesign ---"
codesign --verify --deep --strict --verbose=2 "$APP_PATH"

echo "--- spctl ---"
if ! spctl -a -vv -t install "$APP_PATH" 2>&1; then
  echo "Gatekeeper rejected the app (not notarized or signing incomplete)." >&2
  echo "Check APPLE_ID, APPLE_PASSWORD (app-specific), and APPLE_TEAM_ID secrets." >&2
  exit 1
fi

echo "--- stapler ---"
if command -v xcrun >/dev/null 2>&1; then
  if ! xcrun stapler validate "$APP_PATH" 2>&1; then
    echo "Notarization ticket is missing or not stapled to the app." >&2
    exit 1
  fi
fi

echo "macOS app is signed, notarized, and stapled."
