#!/usr/bin/env bash
# Copy only final installer artifacts from a Tauri build (not AppImage/deb internals).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${1:-$ROOT/release-artifacts}"

mkdir -p "$OUT"

find "$ROOT/src-tauri/target" -type f \( \
  \( -path '*/bundle/deb/*' -name '*.deb' \) -o \
  \( -path '*/bundle/rpm/*' -name '*.rpm' \) -o \
  \( -path '*/bundle/appimage/*' -name '*.AppImage' \) -o \
  \( -path '*/bundle/dmg/*' -name '*.dmg' \) -o \
  \( -path '*/bundle/msi/*' -name '*.msi' \) -o \
  \( -path '*/bundle/nsis/*' -name '*.exe' \) \
\) -exec cp {} "$OUT/" \;

if [[ "$(find "$OUT" -maxdepth 1 -type f | wc -l | tr -d ' ')" -eq 0 ]]; then
  echo "No installer artifacts found under src-tauri/target" >&2
  echo "Bundle directories:" >&2
  find "$ROOT/src-tauri/target" -type d -name bundle 2>/dev/null | head -20 || true
  echo "Installer-like files:" >&2
  find "$ROOT/src-tauri/target" -type f \( -name '*.msi' -o -name '*.exe' -o -name '*.dmg' \) 2>/dev/null | head -20 || true
  exit 1
fi

ls -la "$OUT"
