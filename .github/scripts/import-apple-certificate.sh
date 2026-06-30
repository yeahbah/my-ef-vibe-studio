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

# GitHub secrets are often pasted with line breaks; macOS base64 is strict about stdin.
NORMALIZED_CERT="$(printf '%s' "$APPLE_CERTIFICATE" | tr -d '[:space:]')"

if [[ -z "$NORMALIZED_CERT" ]]; then
  echo "APPLE_CERTIFICATE is set but empty after stripping whitespace." >&2
  echo "Re-encode your .p12 with: openssl base64 -A -in DeveloperID.p12 | pbcopy" >&2
  exit 1
fi

decode_certificate() {
  if printf '%s' "$NORMALIZED_CERT" | base64 --decode -o "$CERT_PATH" 2>/dev/null; then
    return 0
  fi

  if printf '%s' "$NORMALIZED_CERT" | base64 -D -o "$CERT_PATH" 2>/dev/null; then
    return 0
  fi

  if command -v openssl >/dev/null 2>&1; then
    if printf '%s' "$NORMALIZED_CERT" | openssl base64 -d -A -out "$CERT_PATH" 2>/dev/null; then
      return 0
    fi
  fi

  return 1
}

if ! decode_certificate; then
  echo "Failed to decode APPLE_CERTIFICATE." >&2
  echo "Export Developer ID Application as .p12, then run:" >&2
  echo "  openssl base64 -A -in DeveloperID.p12 | pbcopy" >&2
  echo "Paste the single-line output into the APPLE_CERTIFICATE secret (no quotes)." >&2
  exit 1
fi

if [[ ! -s "$CERT_PATH" ]]; then
  echo "Decoded certificate file is empty. Check APPLE_CERTIFICATE encoding." >&2
  exit 1
fi

security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security default-keychain -s "$KEYCHAIN_PATH"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security set-keychain-settings -t 3600 -u "$KEYCHAIN_PATH"

if ! security import "$CERT_PATH" -k "$KEYCHAIN_PATH" -P "$APPLE_CERTIFICATE_PASSWORD" -T /usr/bin/codesign -T /usr/bin/security; then
  echo "Failed to import the .p12 into the CI keychain." >&2
  echo "APPLE_CERTIFICATE_PASSWORD must match the export password you chose in Keychain Access." >&2
  echo "It is NOT your Apple ID password and NOT APPLE_PASSWORD (app-specific password for notarization)." >&2
  echo "Re-export Developer ID Application as .p12, set a new password, then update both secrets:" >&2
  echo "  APPLE_CERTIFICATE (openssl base64 -A -in DeveloperID.p12)" >&2
  echo "  APPLE_CERTIFICATE_PASSWORD" >&2
  exit 1
fi
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security list-keychains -d user -s "$KEYCHAIN_PATH" login.keychain

echo "Available code signing identities:"
security find-identity -v -p codesigning "$KEYCHAIN_PATH"

rm -f "$CERT_PATH"
