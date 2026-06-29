#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${APPLE_CERTIFICATE:-}" ]]; then
  echo "APPLE_CERTIFICATE not set; skipping macOS code signing import."
  exit 0
fi

if [[ -z "${APPLE_CERTIFICATE_PASSWORD:-}" ]]; then
  echo "APPLE_CERTIFICATE_PASSWORD is required when APPLE_CERTIFICATE is set." >&2
  exit 1
fi

if [[ -z "${KEYCHAIN_PASSWORD:-}" ]]; then
  echo "KEYCHAIN_PASSWORD is required when APPLE_CERTIFICATE is set." >&2
  exit 1
fi

KEYCHAIN_PATH="${RUNNER_TEMP:-/tmp}/efvibe-studio-build.keychain"
CERT_PATH="${RUNNER_TEMP:-/tmp}/efvibe-studio-certificate.p12"

echo "$APPLE_CERTIFICATE" | base64 --decode > "$CERT_PATH"

security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security default-keychain -s "$KEYCHAIN_PATH"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security set-keychain-settings -t 3600 -u "$KEYCHAIN_PATH"
security import "$CERT_PATH" -k "$KEYCHAIN_PATH" -P "$APPLE_CERTIFICATE_PASSWORD" -T /usr/bin/codesign -T /usr/bin/security
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security list-keychains -d user -s "$KEYCHAIN_PATH" login.keychain

echo "Available code signing identities:"
security find-identity -v -p codesigning "$KEYCHAIN_PATH"

rm -f "$CERT_PATH"
