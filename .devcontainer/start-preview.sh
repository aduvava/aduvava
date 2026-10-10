#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

preview_is_ready() {
  curl --silent --fail --connect-timeout 1 --max-time 2 http://127.0.0.1:3000/ >/dev/null
}

if preview_is_ready; then
  exit 0
fi

if [[ ! -x node_modules/.bin/next ]]; then
  printf '%s\n' 'Dependencies are missing; running Codespaces setup first.'
  bash .devcontainer/setup-preview.sh
fi

nohup npm run dev > /tmp/eduva-codespaces-next.log 2>&1 < /dev/null &
preview_pid=$!
for _ in $(seq 1 60); do
  if preview_is_ready; then
    printf '%s\n' 'Eduva preview is ready on port 3000.'
    exit 0
  fi
  if ! kill -0 "$preview_pid" 2>/dev/null; then
    break
  fi
  sleep 1
done

printf '%s\n' 'Eduva preview did not start. Recent server log:' >&2
tail -n 80 /tmp/eduva-codespaces-next.log >&2
exit 1
