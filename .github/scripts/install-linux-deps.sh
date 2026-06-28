#!/usr/bin/env bash
# Native libraries required to build MyEFvibe Studio on Linux (Tauri + GTK window hooks).
set -euo pipefail

sudo apt-get update
sudo apt-get install -y \
  build-essential \
  curl \
  wget \
  file \
  libgtk-3-dev \
  libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf \
  libssl-dev \
  libxdo-dev \
  rpm
