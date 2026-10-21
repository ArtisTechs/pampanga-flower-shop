# Applies pending migrations and seeds the database (idempotent: safe to re-run, never drops data).
#
# Usage:
#   .\scripts\db-setup.ps1          # inside Docker Compose (starts db + backend if needed)
#   .\scripts\db-setup.ps1 -Local   # against the DB in backend/.env, without Docker
param(
  [switch]$Local
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if ($Local) {
  Push-Location backend
  try {
    npm run db:setup
    if ($LASTEXITCODE -ne 0) { throw "db:setup failed" }
  } finally {
    Pop-Location
  }
} else {
  docker compose up -d --wait db backend
  if ($LASTEXITCODE -ne 0) { throw "docker compose up failed" }
  docker compose exec backend npm run db:setup
  if ($LASTEXITCODE -ne 0) { throw "db:setup failed" }
}

Write-Host "Database ready."
