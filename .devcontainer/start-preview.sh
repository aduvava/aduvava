#!/usr/bin/env bash
set -euo pipefail
cd /workspaces/aduvava

if curl --silent --fail http://127.0.0.1:3000/ >/dev/null; then
  exit 0
fi

npm run dev > /tmp/eduva-codespaces-next.log 2>&1 &
for _ in $(seq 1 60); do
  if curl --silent --fail http://127.0.0.1:3000/ >/dev/null; then
    printf '%s\n' 'Eduva preview is ready on port 3000.'
    exit 0
  fi
  sleep 1
done

printf '%s\n' 'Eduva preview did not start. Recent server log:' >&2
tail -n 80 /tmp/eduva-codespaces-next.log >&2
exit 1
