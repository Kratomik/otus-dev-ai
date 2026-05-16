#!/usr/bin/env bash
# Один раз: заменить сломанный/старый docker-compose на обёртку к Compose V2.
# Ошибки: KeyError ContainerConfig (v1) или «Cannot open self … docker-compose.pkg» (битый PyInstaller).
set -euo pipefail

BIN_DIR="${HOME}/.local/bin"
SHIM="${BIN_DIR}/docker-compose"
DOCKER_BIN="$(command -v docker || true)"

if [[ -z "${DOCKER_BIN}" ]] || ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: нужен Docker с плагином «docker compose»." >&2
  exit 1
fi

mkdir -p "${BIN_DIR}"

# Удалить битый standalone-бинарник PyInstaller и его архив
rm -f "${SHIM}" "${SHIM}.pkg"

cat > "${SHIM}" << EOF
#!/bin/bash
exec "${DOCKER_BIN}" compose "\$@"
EOF
chmod +x "${SHIM}"

if ! "${SHIM}" version >/dev/null 2>&1; then
  echo "ERROR: обёртка ${SHIM} не работает." >&2
  "${SHIM}" version 2>&1 || true
  exit 1
fi

case ":${PATH}:" in
  *":${BIN_DIR}:"*) ;;
  *)
    echo "Добавьте в ~/.bashrc:"
    echo "  export PATH=\"${BIN_DIR}:\\\$PATH\""
    ;;
esac

echo "OK: ${SHIM} → ${DOCKER_BIN} compose"
command -v docker-compose
"${SHIM}" version | head -1
