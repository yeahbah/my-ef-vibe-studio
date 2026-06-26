#!/usr/bin/env bash
set -euo pipefail

gtk-update-icon-cache -f /usr/share/icons/hicolor >/dev/null 2>&1 || true
update-desktop-database /usr/share/applications >/dev/null 2>&1 || true

ICON_256="/usr/share/icons/hicolor/256x256/apps/my-ef-vibe-studio.png"
PIXMAP="/usr/share/pixmaps/my-ef-vibe-studio.png"
if [[ -f "$ICON_256" && ! -f "$PIXMAP" ]]; then
  cp "$ICON_256" "$PIXMAP"
fi

if command -v kbuildsycoca6 >/dev/null 2>&1; then
  kbuildsycoca6 --noincremental >/dev/null 2>&1 || true
elif command -v kbuildsycoca5 >/dev/null 2>&1; then
  kbuildsycoca5 --noincremental >/dev/null 2>&1 || true
fi
