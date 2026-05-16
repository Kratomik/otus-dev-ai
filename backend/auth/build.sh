#!/usr/bin/env bash
# Сборка auth (GoTrue v2.186.0 + Yandex). Запуск из каталога backend: ./auth/build.sh
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUTH_DIR="${BACKEND_DIR}/auth"
DIST_DIR="${AUTH_DIR}/dist"
IMAGE="${AUTH_IMAGE:-ecotrack-gotrue:yandex}"
GOTRUE_VERSION="${GOTRUE_VERSION:-v2.186.0}"
GOLANG_IMAGE="${GOLANG_IMAGE:-golang:1.25.5-bookworm}"

log() { printf '==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

if ! command -v docker >/dev/null 2>&1; then
  die "Docker не найден. Установите Docker и повторите."
fi

cd "${BACKEND_DIR}"

if [[ ! -d "${AUTH_DIR}/gotrue-src" ]]; then
  log "Скачивание и патч GoTrue ${GOTRUE_VERSION}..."
  "${AUTH_DIR}/prepare-source.sh"
fi

rm -rf "${DIST_DIR}"
mkdir -p "${DIST_DIR}"

log "Компиляция GoTrue в контейнере ${GOLANG_IMAGE} (может занять несколько минут)..."
if ! docker run --rm \
  --network host \
  -v "${AUTH_DIR}/gotrue-src:/src:ro" \
  -v "${DIST_DIR}:/out" \
  -w /src \
  -e CGO_ENABLED=0 \
  -e GOOS=linux \
  -e GO111MODULE=on \
  "${GOLANG_IMAGE}" \
  bash -ec "
    set -euo pipefail
    go mod download
    go mod verify
    go build -buildvcs=false \
      -ldflags \"-X github.com/supabase/auth/internal/utilities.Version=${GOTRUE_VERSION}-yandex\" \
      -o /out/auth .
    test -f /out/auth
  "; then
  die "Не удалось скомпилировать GoTrue. Проверьте интернет (go mod download) и логи выше."
fi

log "Сборка Docker-образа ${IMAGE}..."
export DOCKER_BUILDKIT=1
if ! docker build -f "${AUTH_DIR}/Dockerfile" -t "${IMAGE}" "${AUTH_DIR}"; then
  die "Не удалось собрать образ. Убедитесь, что доступен supabase/gotrue:v2.186.0 (docker pull supabase/gotrue:v2.186.0)."
fi

log "Готово: ${IMAGE}"
log "Перезапуск auth: ./auth/recreate-auth.sh"
log "(если db/mail в Exit 0 — сначала ./auth/repair-stack.sh)"
