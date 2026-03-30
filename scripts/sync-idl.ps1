#!/usr/bin/env pwsh
# sync-idl.ps1  —  Run after every `anchor build` to keep IDL in sync.
# Usage:  .\scripts\sync-idl.ps1 [--build]
#
# With --build flag: also runs `anchor build` first.
# Without:           just copies the already-built artifacts.

param([switch]$Build)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot ? (Split-Path $PSScriptRoot -Parent) : (Get-Location).Path

$srcJson = Join-Path $root "backend\target\idl\agentid_program.json"
$srcTs   = Join-Path $root "backend\target\types\agentid_program.ts"

$destinations = @(
  @{ json = "packages\sdk\src\idl\agentid_program.json"; ts = $null },
  @{ json = "frontend\src\idl\agentid_program.json";    ts = "frontend\src\idl\agentid_program.ts" }
)

# Optionally build first
if ($Build) {
  Write-Host "Running anchor build..." -ForegroundColor Cyan
  Push-Location (Join-Path $root "backend")
  anchor build
  Pop-Location
}

# Check source exists
if (-not (Test-Path $srcJson)) {
  Write-Error "IDL not found at $srcJson. Run 'anchor build' first or use -Build flag."
  exit 1
}

# Copy to all destinations
foreach ($dst in $destinations) {
  $dstJson = Join-Path $root $dst.json
  $dstDir  = Split-Path $dstJson
  if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
  Copy-Item $srcJson $dstJson -Force
  Write-Host "  IDL JSON -> $($dst.json)  ($((Get-Item $dstJson).Length) bytes)" -ForegroundColor Green

  if ($dst.ts -and (Test-Path $srcTs)) {
    $dstTs = Join-Path $root $dst.ts
    Copy-Item $srcTs $dstTs -Force
    Write-Host "  IDL  TS  -> $($dst.ts)  ($((Get-Item $dstTs).Length) bytes)" -ForegroundColor Green
  }
}

# Quick sanity check - count instructions
$idl = Get-Content $srcJson | ConvertFrom-Json
Write-Host ""
Write-Host "IDL sync complete. Instructions ($($idl.instructions.Count)):" -ForegroundColor Cyan
$idl.instructions | ForEach-Object { Write-Host "  - $($_.name)" }
