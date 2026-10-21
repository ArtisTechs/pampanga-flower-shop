#!/usr/bin/env sh
# Applies pending migrations and seeds the database (idempotent: safe to re-run, never drops data).
#
# Usage:
#   scripts/db-setup.sh           # inside Docker Compose (starts db + backend if needed)
#   scripts/db-setup.sh --local   # against the DB in backend/.env, without Docker
set -eu

cd "$(dirname "$0")/.."

if [ "${1:-}" = "--local" ]; then
  cd backend
  npm run db:setup
else
  docker compose up -d --wait db backend
  docker compose exec backend npm run db:setup
fi

echo "Database ready."
