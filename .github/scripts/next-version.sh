#!/usr/bin/env bash
# Prints the next patch version for MyEFvibe Studio.
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root"

bump_patch() {
  local ver="${1%%-*}"
  local major minor patch
  IFS=. read -r major minor patch <<<"$ver"
  patch=$((patch + 1))
  echo "${major}.${minor}.${patch}"
}

latest_from_git() {
  git tag -l 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname 2>/dev/null | head -n1 | sed 's/^v//' || true
}

latest_from_package_json() {
  jq -r '.version // empty' package.json 2>/dev/null || true
}

latest_from_tauri_conf() {
  jq -r '.version // empty' src-tauri/tauri.conf.json 2>/dev/null || true
}

G="$(latest_from_git)"
P="$(latest_from_package_json)"
T="$(latest_from_tauri_conf)"

BASE="$(printf '%s\n%s\n%s\n' "$G" "$P" "$T" | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -n1)"
if [[ -z "$BASE" ]]; then
  BASE="0.2.0"
fi

bump_patch "$BASE"
