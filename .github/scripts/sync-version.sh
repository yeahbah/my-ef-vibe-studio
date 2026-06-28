#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:?Usage: sync-version.sh <semver>}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
  echo "Invalid version: $VERSION" >&2
  exit 1
fi

jq --arg v "$VERSION" '.version = $v' "$ROOT/package.json" > "$ROOT/package.json.tmp"
mv "$ROOT/package.json.tmp" "$ROOT/package.json"

jq --arg v "$VERSION" '.version = $v' "$ROOT/src-tauri/tauri.conf.json" > "$ROOT/src-tauri/tauri.conf.json.tmp"
mv "$ROOT/src-tauri/tauri.conf.json.tmp" "$ROOT/src-tauri/tauri.conf.json"

sed "s/^version = \".*\"/version = \"${VERSION}\"/" "$ROOT/src-tauri/Cargo.toml" > "$ROOT/src-tauri/Cargo.toml.tmp"
mv "$ROOT/src-tauri/Cargo.toml.tmp" "$ROOT/src-tauri/Cargo.toml"

echo "Synced MyEFvibe Studio version to ${VERSION}"
