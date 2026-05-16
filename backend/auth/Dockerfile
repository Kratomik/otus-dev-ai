# syntax=docker/dockerfile:1
# Бинарник с Yandex: ./auth/build.sh (создаёт dist/auth)
FROM supabase/gotrue:v2.186.0

USER root
COPY --chmod=755 dist/auth /usr/local/bin/auth
USER supabase
