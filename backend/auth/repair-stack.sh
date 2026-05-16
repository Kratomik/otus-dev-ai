#!/usr/bin/env bash
# Восстановление стека после сбоя docker-compose v1 (KeyError: ContainerConfig).
# Запуск из backend: ./auth/repair-stack.sh
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${BACKEND_DIR}"

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: нужен Docker Compose V2 (команда «docker compose»)." >&2
  exit 1
fi

# Починить сломанный ~/.local/bin/docker-compose (PyInstaller: Cannot open self …)
if command -v docker-compose >/dev/null 2>&1; then
  if ! docker-compose version >/dev/null 2>&1; then
    echo "==> Починка docker-compose (setup-compose.sh)..."
    "${BACKEND_DIR}/setup-compose.sh"
  fi
fi

COMPOSE=(docker compose)

echo "==> Остановка проекта supabase..."
"${COMPOSE[@]}" down --remove-orphans 2>/dev/null || true

echo "==> Удаление зависших контейнеров (v1 recreate, db/mail)..."
docker rm -f supabase-db supabase-mail 2>/dev/null || true
docker ps -aq --filter 'name=supabase-db' --filter 'name=supabase-mail' 2>/dev/null | xargs -r docker rm -f
# Контейнеры вида 08a349cf03e6_supabase-db после падения docker-compose v1
docker ps -a --format '{{.Names}}' | grep -E '^[0-9a-f]{12}_supabase-' | xargs -r docker rm -f

echo "==> Подъём всего стека..."
"${COMPOSE[@]}" up -d

echo "==> Готово. Проверка: ${COMPOSE[*]} ps auth db mail health-check"
