#!/usr/bin/env bash
# Fail the release if the macOS app is not signed and notarized.
set -euo pipefail

if [[ -z "${APPLE_SIGNING_IDENTITY:-}" ]]; then
  echo "APPLE_SIGNING_IDENTITY not set; skipping macOS signing verification."
  exit 0
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TARGET_ROOT="$ROOT/src-tauri/target"
MOUNT_DIR=""

cleanup() {
  if [[ -n "$MOUNT_DIR" && -d "$MOUNT_DIR" ]]; then
    hdiutil detach "$MOUNT_DIR" -quiet || true
  fi
}
trap cleanup EXIT

find_macos_app_bundle() {
  local -a candidates=()

  while IFS= read -r app_path; do
    candidates+=("$app_path")
  done < <(
    find "$TARGET_ROOT" -type d -name '*.app' 2>/dev/null |
      grep '/bundle/' |
      sort
  )

  for app_path in "${candidates[@]}"; do
    if [[ "$app_path" == *"/bundle/macos/"* ]] || [[ "$app_path" == *"/bundle/macos-"* ]]; then
      echo "$app_path"
      return 0
    fi
  done

  if [[ ${#candidates[@]} -gt 0 ]]; then
    echo "${candidates[0]}"
    return 0
  fi

  return 1
}

find_app_bundle_from_dmg() {
  local dmg_path
  dmg_path="$(find "$TARGET_ROOT" -type f -path '*/bundle/dmg/*.dmg' 2>/dev/null | sort | tail -n 1 || true)"

  if [[ -z "$dmg_path" ]]; then
    return 1
  fi

  MOUNT_DIR="$(mktemp -d /tmp/efvibe-studio-dmg.XXXXXX)"
  hdiutil attach "$dmg_path" -nobrowse -readonly -mountpoint "$MOUNT_DIR" >/dev/null

  find "$MOUNT_DIR" -type d -name '*.app' 2>/dev/null | sort | head -n 1
}

APP_PATH="$(find_macos_app_bundle || true)"

if [[ -z "$APP_PATH" ]]; then
  APP_PATH="$(find_app_bundle_from_dmg || true)"
fi

if [[ -z "$APP_PATH" ]]; then
  echo "No .app bundle found under $TARGET_ROOT for signing verification." >&2
  echo "Bundle directories discovered:" >&2
  find "$TARGET_ROOT" -type d -name bundle 2>/dev/null | head -20 >&2 || true
  echo "App bundles discovered:" >&2
  find "$TARGET_ROOT" -type d -name '*.app' 2>/dev/null | head -20 >&2 || true
  echo "DMG artifacts discovered:" >&2
  find "$TARGET_ROOT" -type f -path '*/bundle/dmg/*.dmg' 2>/dev/null | head -20 >&2 || true
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
