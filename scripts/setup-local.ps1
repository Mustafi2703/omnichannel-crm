[CmdletBinding()]
param(
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$sharedEnvDirectory = Join-Path $env:LOCALAPPDATA "OmniCRM"
$sharedEnvPath = Join-Path $sharedEnvDirectory "shared.env"
$worktreeEnvPath = Join-Path $repositoryRoot ".env"
$exampleEnvPath = Join-Path $repositoryRoot ".env.example"

if (-not (Test-Path $exampleEnvPath)) {
  throw ".env.example is missing from $repositoryRoot"
}

if (-not (Test-Path $sharedEnvPath)) {
  New-Item -ItemType Directory -Path $sharedEnvDirectory -Force | Out-Null
  Copy-Item -LiteralPath $exampleEnvPath -Destination $sharedEnvPath
  Write-Host "Created shared environment template: $sharedEnvPath"
  Write-Host "Set DATABASE_URL and JWT_SECRET in that file, then run this command again."
}

if ((Test-Path $worktreeEnvPath) -and -not $Force) {
  Write-Host "Keeping existing worktree environment: $worktreeEnvPath"
} else {
  Copy-Item -LiteralPath $sharedEnvPath -Destination $worktreeEnvPath -Force
  Write-Host "Copied shared environment into this worktree: $worktreeEnvPath"
}

Write-Host "Next: npm ci; npm run db:setup; npm run dev"
