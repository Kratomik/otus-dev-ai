#!/usr/bin/env bash
# Запуск Compose V2 без docker-compose в PATH.
# Из backend/: ./compose.sh up -d
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
exec docker compose "$@"
