#!/usr/bin/env bash
# Применить SITE_URL из backend/.env к контейнеру auth (нужен 5173 для Vite, не 3000).
set -euo pipefail
cd "$(dirname "$0")/.."
SITE_URL="$(grep -E '^SITE_URL=' .env | cut -d= -f2- | tr -d '"' || true)"
if [[ -z "${SITE_URL}" ]]; then
  echo "SITE_URL не задан в backend/.env" >&2
  exit 1
fi
echo "==> SITE_URL=${SITE_URL}"
docker compose up -d --force-recreate auth kong
echo "==> GOTRUE_SITE_URL в контейнере:"
docker exec supabase-auth printenv GOTRUE_SITE_URL
