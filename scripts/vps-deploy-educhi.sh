#!/usr/bin/env bash
# Install a ROOT-OWNED copy to /usr/local/sbin/educhi-deploy.
# Its location must never be writable by GitHub's restricted SSH user.
set -Eeuo pipefail
umask 077

fail() { echo "EDUCHI DEPLOY FAILED: $*" >&2; exit 1; }
trap 'echo "Deployment interrupted; review the VPS service logs before retrying." >&2' ERR

# Input is only a tested commit SHA, not an arbitrary command.
IFS= read -r target_sha || fail "Missing commit SHA"
[[ "$target_sha" =~ ^[0-9a-f]{40}$ ]] || fail "Invalid commit SHA"

[[ -r /etc/educhi-deploy.conf ]] || fail "Missing /etc/educhi-deploy.conf"
# This root-owned config must define EDUCHI_PROJECT_DIR, no passwords.
# shellcheck source=/dev/null
source /etc/educhi-deploy.conf
[[ -n "${EDUCHI_PROJECT_DIR:-}" ]] || fail "Missing EDUCHI_PROJECT_DIR"
[[ -d "$EDUCHI_PROJECT_DIR/.git" ]] || fail "Not a Git checkout: $EDUCHI_PROJECT_DIR"

# One deploy at a time, even if another workflow is started.
exec 9>/run/lock/educhi-vps-deploy.lock
flock -n 9 || fail "Another deployment is running"

cd "$EDUCHI_PROJECT_DIR"
[[ "$(git branch --show-current)" == "main" ]] || fail "VPS checkout must be on main"
git diff --quiet && git diff --cached --quiet || fail "Local tracked changes exist; refusing to overwrite them"
git fetch --no-tags origin main
remote_sha="$(git rev-parse refs/remotes/origin/main)"
if [[ "$target_sha" != "$remote_sha" ]]; then
  echo "Skipping superseded deploy: tested $target_sha, current main $remote_sha"
  exit 0
fi

# Mandatory local, private backups BEFORE DB migrations or container changes.
# Also maintain off-VPS backups. Backups on the same disk are not sufficient.
backup_dir=/var/backups/educhi
install -d -m 0700 "$backup_dir"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
echo "Backing up database..."
docker compose exec -T db pg_dump -U postgres -d eduva -Fc > "$backup_dir/db-$stamp.dump"
test -s "$backup_dir/db-$stamp.dump" || fail "Database backup is empty"
echo "Backing up uploaded files..."
docker compose exec -T web tar -czf - -C /app storage > "$backup_dir/uploads-$stamp.tar.gz"
test -s "$backup_dir/uploads-$stamp.tar.gz" || fail "Upload backup is empty"

echo "Updating source and preparing images..."
git merge --ff-only origin/main
docker compose build web admin
# Database changes must be additive or coordinated with app upgrades.
docker compose run --rm web npx prisma migrate deploy

# The site requires malware scanning for uploads. Running 'up' is idempotent.
docker compose --profile malware-scanning up -d clamav
docker compose up -d --no-build web admin

echo "Checking backend services..."
docker compose exec -T web node scripts/public-launch-preflight.js

for attempt in $(seq 1 30); do
  if curl -fsS --max-time 5 http://127.0.0.1:3000/api/auth/csrf >/dev/null && \
     curl -fsS --max-time 5 http://127.0.0.1:4000/health >/dev/null; then
    echo "Educhi is responding; deployment completed."
    docker compose ps
    # Prune ONLY old backups created by this script; keep the last 14 days.
    find "$backup_dir" -maxdepth 1 -type f \
      \( -name 'db-*.dump' -o -name 'uploads-*.tar.gz' \) -mtime +14 -delete
    exit 0
  fi
  sleep 2
done
fail "Services were not healthy after upgrade; investigate VPS. No automatic rollback performed."
