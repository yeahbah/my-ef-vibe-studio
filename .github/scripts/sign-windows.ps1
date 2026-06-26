# Signs Windows MSI/NSIS installers when WINDOWS_CERTIFICATE is set.
# Secrets (repository settings):
#   WINDOWS_CERTIFICATE — base64-encoded .pfx
#   WINDOWS_CERTIFICATE_PASSWORD — PFX password

$ErrorActionPreference = "Stop"

if (-not $env:WINDOWS_CERTIFICATE) {
  Write-Host "WINDOWS_CERTIFICATE not set; skipping Authenticode signing."
  exit 0
}

if (-not $env:WINDOWS_CERTIFICATE_PASSWORD) {
  Write-Error "WINDOWS_CERTIFICATE_PASSWORD is required when WINDOWS_CERTIFICATE is set."
}

$artifactDir = Join-Path $PSScriptRoot "..\..\release-artifacts"
if (-not (Test-Path $artifactDir)) {
  Write-Error "Release artifacts directory not found: $artifactDir"
}

$files = Get-ChildItem -Path $artifactDir -File -Include *.msi, *.exe
if ($files.Count -eq 0) {
  Write-Error "No .msi or .exe files found in $artifactDir"
}

$tempPfx = Join-Path $env:RUNNER_TEMP "efvibe-studio-codesign.pfx"
[IO.File]::WriteAllBytes($tempPfx, [Convert]::FromBase64String($env:WINDOWS_CERTIFICATE))

$signtool = Get-ChildItem -Path "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\signtool.exe" -ErrorAction SilentlyContinue |
  Sort-Object FullName -Descending |
  Select-Object -First 1

if (-not $signtool) {
  Write-Error "signtool.exe not found. Install the Windows SDK on the runner."
}

foreach ($file in $files) {
  Write-Host "Signing $($file.FullName)"
  & $signtool.FullName sign `
    /fd SHA256 `
    /f $tempPfx `
    /p $env:WINDOWS_CERTIFICATE_PASSWORD `
    /tr http://timestamp.digicert.com `
    /td SHA256 `
    $file.FullName

  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

Remove-Item $tempPfx -Force
Write-Host "Signed $($files.Count) installer(s)."
