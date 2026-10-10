#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ ! -x node_modules/.bin/next ]]; then
  printf '%s\n' 'Dependencies are missing; running Codespaces setup first.'
  bash .devcontainer/setup-preview.sh
fi

# The standalone admin server uses process.env; Next.js loads .env.local itself.
configured_database_url="${DATABASE_URL:-}"
if [[ -f .env.local ]]; then
  set -a
  . ./.env.local
  set +a
fi
if [[ -n "$configured_database_url" ]]; then export DATABASE_URL="$configured_database_url"; fi

preview_is_ready() {
  curl --silent --fail --connect-timeout 1 --max-time 2 http://127.0.0.1:3000/ >/dev/null
}

admin_is_ready() {
  curl --silent --fail --connect-timeout 1 --max-time 2 http://127.0.0.1:4000/health >/dev/null
}

if preview_is_ready; then
  printf '%s\n' 'Eduva student site is already running on port 3000.'
else
  nohup npm run dev > /tmp/eduva-codespaces-next.log 2>&1 < /dev/null &
  preview_pid=$!
  for _ in $(seq 1 60); do
    if preview_is_ready; then
      printf '%s\n' 'Eduva student site is ready on port 3000.'
      break
    fi
    if ! kill -0 "$preview_pid" 2>/dev/null; then
      printf '%s\n' 'Eduva student site did not start. Recent server log:' >&2
      tail -n 80 /tmp/eduva-codespaces-next.log >&2
      exit 1
    fi
    sleep 1
  done
  if ! preview_is_ready; then
    printf '%s\n' 'Eduva student site did not become ready. Recent server log:' >&2
    tail -n 80 /tmp/eduva-codespaces-next.log >&2
    exit 1
  fi
fi

if admin_is_ready; then
  printf '%s\n' 'Eduva admin server is already running on port 4000.'
else
  ADMIN_HOST=0.0.0.0 nohup npm run admin:start > /tmp/eduva-codespaces-admin.log 2>&1 < /dev/null &
  admin_pid=$!
  for _ in $(seq 1 30); do
    if admin_is_ready; then
      printf '%s\n' 'Eduva standalone admin is ready on port 4000.'
      break
    fi
    if ! kill -0 "$admin_pid" 2>/dev/null; then
      printf '%s\n' 'Eduva admin server did not start. Recent server log:' >&2
      tail -n 80 /tmp/eduva-codespaces-admin.log >&2
      exit 1
    fi
    sleep 1
  done
  if ! admin_is_ready; then
    printf '%s\n' 'Eduva admin server did not become ready. Recent server log:' >&2
    tail -n 80 /tmp/eduva-codespaces-admin.log >&2
    exit 1
  fi
fi
