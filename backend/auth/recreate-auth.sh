#!/usr/bin/env bash
# Перезапуск только auth без бага docker-compose v1 (KeyError: ContainerConfig).
# Запуск из backend: ./auth/recreate-auth.sh
#
# Yandex OAuth 504 (таймаут oauth.yandex.ru из bridge):
#   AUTH_USE_HOST_NETWORK=1 ./auth/recreate-auth.sh
#   docker compose -f docker-compose.yml -f docker-compose.auth-hostnet.yml up -d kong
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${BACKEND_DIR}"

COMPOSE=(docker-compose)
if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
fi

COMPOSE_FILES=(-f docker-compose.yml)
if [[ "${AUTH_USE_HOST_NETWORK:-}" == "1" ]]; then
  COMPOSE_FILES+=(-f docker-compose.auth-hostnet.yml)
  echo "==> Режим host network для auth (исходящий HTTPS через хост)"
fi

echo "==> Остановка и удаление контейнера supabase-auth..."
docker rm -f supabase-auth 2>/dev/null || true

echo "==> Запуск auth (образ ecotrack-gotrue:yandex)..."
"${COMPOSE[@]}" "${COMPOSE_FILES[@]}" up -d --no-deps auth

echo "==> Ожидание healthcheck..."
for _ in $(seq 1 30); do
  status="$(docker inspect supabase-auth --format '{{.State.Health.Status}}' 2>/dev/null || echo 'none')"
  if [[ "${status}" == "healthy" ]]; then
    echo "auth: healthy"
    if [[ "${AUTH_USE_HOST_NETWORK:-}" == "1" ]]; then
      echo "==> Перезапустите Kong: docker compose -f docker-compose.yml -f docker-compose.auth-hostnet.yml up -d kong"
    fi
    exit 0
  fi
  if [[ "$(docker inspect supabase-auth --format '{{.State.Status}}' 2>/dev/null)" == "running" ]] && [[ "${status}" == "none" ]]; then
    echo "auth: running (healthcheck не настроен)"
  fi
  sleep 2
done

echo "WARN: auth не стал healthy. Логи:" >&2
docker logs supabase-auth --tail 30 >&2
exit 1
