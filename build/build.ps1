#!/usr/bin/env pwsh
<#
  build.ps1 — TabToTable AI (Chrome extension)
  One-command build/validation per _AUDIT/STANDARDS.md §9.

  What it does:
    1. Validates manifest.json and both _locales/*/messages.json as JSON.
    2. Runs `node --check` on every src/**/*.js file (catches syntax errors
       before packaging — this is the "build" for a Chrome extension, since
       there's no compiler/bundler in this project).
    3. Confirms the manifest_version's icon files (16/32/48/128) exist on disk
       at the sizes Chrome expects (§15.4).
    4. Confirms every _locales key referenced by manifest.json's __MSG_*__
       placeholders resolves in both en/he message files.
    5. Removes the previous <name>-v<old-version>.zip from the project root
       (single ZIP rule, §1) and packages a fresh
       TabToTable-AI-v<version>.zip containing only the files Chrome needs
       (no node_modules, no .md docs, no site/, no build/, no store/).

  Usage (from the project root or anywhere):
    pwsh build/build.ps1
  Exits non-zero on the first failed check.
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Fail($msg) {
  Write-Host "BUILD FAILED: $msg" -ForegroundColor Red
  exit 1
}

Write-Host "== TabToTable AI build/validate ==" -ForegroundColor Cyan

# 1. manifest.json + locales must be valid JSON
foreach ($f in @('manifest.json', '_locales/en/messages.json', '_locales/he/messages.json')) {
  try {
    Get-Content $f -Raw -Encoding UTF8 | ConvertFrom-Json | Out-Null
    Write-Host "  OK  $f is valid JSON"
  } catch {
    Fail "$f is not valid JSON: $($_.Exception.Message)"
  }
}

$manifest = Get-Content 'manifest.json' -Raw -Encoding UTF8 | ConvertFrom-Json
$version = $manifest.version
if (-not $version) { Fail "manifest.json has no version field" }
Write-Host "  Version: $version"

# 2. node --check on every JS file
$jsFiles = Get-ChildItem -Path 'src' -Filter '*.js' -Recurse
foreach ($f in $jsFiles) {
  & node --check $f.FullName
  if ($LASTEXITCODE -ne 0) { Fail "node --check failed on $($f.FullName)" }
}
Write-Host "  OK  node --check passed on $($jsFiles.Count) JS files"

# 3. Icon set — 16/32/48/128, all present
$requiredIcons = @('icon16.png', 'icon32.png', 'icon48.png', 'icon128.png')
foreach ($icon in $requiredIcons) {
  $path = "assets/icons/$icon"
  if (-not (Test-Path $path)) { Fail "missing required icon: $path (see STANDARDS.md 15.4)" }
}
Write-Host "  OK  all 4 required icon sizes present (16/32/48/128)"

# 4. __MSG_*__ placeholders in manifest resolve in both locales
$en = Get-Content '_locales/en/messages.json' -Raw -Encoding UTF8 | ConvertFrom-Json
$he = Get-Content '_locales/he/messages.json' -Raw -Encoding UTF8 | ConvertFrom-Json
$manifestRaw = Get-Content 'manifest.json' -Raw -Encoding UTF8
$msgRefs = [regex]::Matches($manifestRaw, '__MSG_(\w+)__') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
foreach ($key in $msgRefs) {
  if (-not $en.PSObject.Properties[$key]) { Fail "manifest references __MSG_${key}__ but _locales/en/messages.json has no '$key' key" }
  if (-not $he.PSObject.Properties[$key]) { Fail "manifest references __MSG_${key}__ but _locales/he/messages.json has no '$key' key" }
}
Write-Host "  OK  all __MSG_*__ placeholders resolve in en+he"

# 5. Package the ZIP — remove old versioned ZIPs first (no duplicates in root)
Get-ChildItem -Path $root -Filter 'TabToTable-AI-v*.zip' | ForEach-Object {
  Write-Host "  Removing stale package: $($_.Name)"
  Remove-Item $_.FullName -Force
}

$zipName = "TabToTable-AI-v$version.zip"
$zipPath = Join-Path $root $zipName
$includePaths = @('manifest.json', '_locales', 'assets/icons', 'src')

$stageDir = Join-Path $env:TEMP "tabtotable-build-stage-$([guid]::NewGuid())"
New-Item -ItemType Directory -Path $stageDir | Out-Null
try {
  foreach ($p in $includePaths) {
    $dest = Join-Path $stageDir $p
    $destParent = Split-Path -Parent $dest
    New-Item -ItemType Directory -Path $destParent -Force | Out-Null
    Copy-Item -Path (Join-Path $root $p) -Destination $dest -Recurse
  }
  Compress-Archive -Path (Join-Path $stageDir '*') -DestinationPath $zipPath -Force
} finally {
  Remove-Item $stageDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "  OK  packaged $zipName" -ForegroundColor Green
Write-Host "== Build complete ==" -ForegroundColor Cyan
