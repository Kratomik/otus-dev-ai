#!/usr/bin/env bash
# Восстановление стека после сбоя docker-compose v1 (ContainerConfig / Exit db|mail).
# Запуск из backend: ./auth/repair-stack.sh
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${BACKEND_DIR}"

COMPOSE=(docker-compose)
if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
fi

echo "==> Остановка проекта supabase..."
"${COMPOSE[@]}" down --remove-orphans 2>/dev/null || true

echo "==> Удаление зависших контейнеров db/mail..."
docker rm -f supabase-db supabase-mail 2>/dev/null || true
docker ps -aq --filter 'name=supabase-db' --filter 'name=supabase-mail' 2>/dev/null | xargs -r docker rm -f

echo "==> Подъём всего стека..."
"${COMPOSE[@]}" up -d

echo "==> Готово. Проверка: ${COMPOSE[*]} ps auth db mail"
