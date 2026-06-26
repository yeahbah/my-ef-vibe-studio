#!/usr/bin/env bash
# Copy only final installer artifacts from a Tauri build (not AppImage/deb internals).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${1:-$ROOT/release-artifacts}"

mkdir -p "$OUT"

find "$ROOT/src-tauri/target" -type f \( \
  -path '*/bundle/deb/*.deb' -o \
  -path '*/bundle/rpm/*.rpm' -o \
  -path '*/bundle/appimage/*.AppImage' -o \
  -path '*/bundle/dmg/*.dmg' -o \
  -path '*/bundle/msi/*.msi' -o \
  -path '*/bundle/nsis/*.exe' \
\) -exec cp {} "$OUT/" \;

if [[ "$(find "$OUT" -maxdepth 1 -type f | wc -l | tr -d ' ')" -eq 0 ]]; then
  echo "No installer artifacts found under src-tauri/target" >&2
  find "$ROOT/src-tauri/target" -maxdepth 5 -type d -path '*/bundle/*' 2>/dev/null | head -30 || true
  exit 1
fi

ls -la "$OUT"
