#!/usr/bin/env bash
# Prints the next patch version (e.g. 0.2.5) by taking the max of git tags,
# GitHub Releases, and repo manifests, then bumping patch.
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

latest_from_github_releases() {
  local json tag
  if json="$(curl -fsSL "https://api.github.com/repos/yeahbah/my-ef-vibe-studio/releases/latest" 2>/dev/null)"; then
    tag="$(echo "$json" | jq -r '.tag_name // empty' 2>/dev/null | sed 's/^v//')"
    if [[ "$tag" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      echo "$tag"
    fi
  fi
}

latest_from_package_json() {
  jq -r '.version // empty' package.json 2>/dev/null || true
}

latest_from_tauri_conf() {
  jq -r '.version // empty' src-tauri/tauri.conf.json 2>/dev/null || true
}

latest_from_cargo_toml() {
  grep -E '^version = ' src-tauri/Cargo.toml 2>/dev/null | head -n1 | sed -E 's/^version = "(.*)"/\1/' || true
}

G="$(latest_from_git)"
R="$(latest_from_github_releases)"
P="$(latest_from_package_json)"
T="$(latest_from_tauri_conf)"
C="$(latest_from_cargo_toml)"

BASE="$(
  printf '%s\n%s\n%s\n%s\n%s\n' "$G" "$R" "$P" "$T" "$C" \
    | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' \
    | sort -V \
    | tail -n1
)"
if [[ -z "$BASE" ]]; then
  BASE="0.2.0"
fi

bump_patch "$BASE"
