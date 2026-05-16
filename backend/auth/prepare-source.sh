#!/usr/bin/env bash
# Локальная подготовка исходников (если docker build не может скачать GitHub).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION="${GOTRUE_VERSION:-v2.186.0}"
DEST="${ROOT}/gotrue-src"

rm -rf "${DEST}"
mkdir -p "${DEST}"

curl -fsSL "https://github.com/supabase/auth/archive/refs/tags/${VERSION}.tar.gz" \
  | tar -xzf - -C "${DEST}" --strip-components=1

cp "${ROOT}/provider/yandex.go" "${DEST}/internal/api/provider/yandex.go"
patch -p1 -d "${DEST}" < "${ROOT}/patches/0001-add-yandex-provider.patch"

# GoTrue must not forward redirect_to/redirect_uri to Yandex (causes redirect_uri mismatch).
python3 - "${DEST}/internal/api/external.go" <<'PY'
import sys
path = sys.argv[1]
needle = '\tquery.Del("code_challenge_method")\n'
insert = (
    '\tquery.Del("code_challenge_method")\n'
    '\tquery.Del("redirect_to")\n'
    '\tquery.Del("redirect_uri")\n'
    '\tquery.Del("invite_token")\n'
    '\tquery.Del("skip_http_redirect")\n'
)
text = open(path, encoding="utf-8").read()
if "query.Del(\"redirect_to\")" not in text:
    if needle not in text:
        raise SystemExit(f"anchor not found in {path}")
    open(path, "w", encoding="utf-8").write(text.replace(needle, insert, 1))
PY

echo "Prepared ${DEST} (tag ${VERSION})"
