#!/usr/bin/env bash
# One-time, production-only recovery of legacy Educhi exam-classification schema.
# Usage: cd /opt/eduva && bash scripts/repair-legacy-exam-classification.sh
set -Eeuo pipefail
umask 077

fail() { echo "RECOVERY STOPPED: $*" >&2; exit 1; }
[[ -f docker-compose.yml && -f scripts/repair-legacy-exam-classification.sql ]] ||
  fail "Run from the Educhi source folder after git pull."
command -v docker >/dev/null || fail "Docker Compose is required."

backup_dir=/var/backups/educhi
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
backup="$backup_dir/exam-schema-before-repair-$(date -u +%Y%m%dT%H%M%SZ).dump"

echo "Step 1/8: Backing up the full PostgreSQL database to $backup"
docker compose exec -T db pg_dump -U postgres -d eduva -Fc > "$backup" ||
  fail "pg_dump failed; database repair was not attempted"
[[ -s "$backup" ]] || fail "Database backup file is empty; repair was not attempted."
[[ "$(head -c 5 "$backup")" == "PGDMP" ]] ||
  fail "Database backup does not have the PostgreSQL custom-format header."

read_count() {
  docker compose exec -T db psql -U postgres -d eduva -X -A -t -v ON_ERROR_STOP=1 -c 'SELECT COUNT(*) FROM "Exam";'
}
before=$(read_count) || fail "Cannot inspect the Exam table."
[[ "$before" =~ ^[0-9]+$ ]] || fail "Invalid Exam count from PostgreSQL."

echo "Step 2/8: Repairing legacy grade and category columns in one transaction"
docker compose exec -T db psql -U postgres -d eduva -X -v ON_ERROR_STOP=1 < scripts/repair-legacy-exam-classification.sql ||
  fail "SQL transaction failed and rolled back; review the SQL error."

after=$(read_count) || fail "Cannot confirm Exam count."
[[ "$before" == "$after" ]] ||
  fail "Exam row count changed from $before to $after. Do not proceed."

echo "Step 3/8: Checking repaired Exam columns before updating migration history"
docker compose run --rm web node scripts/verify-exam-schema.js ||
  fail "Exam schema check failed; migration history was not changed."

echo "Step 4/8: Reconciling Prisma migration history after applying equivalent SQL"
for migration in 20261109001000_exam_grade 20261109004500_exam_content_mode; do
  applied=$(docker compose exec -T db psql -U postgres -d eduva -X -A -t -v ON_ERROR_STOP=1 -c \
    "SELECT CASE WHEN EXISTS (SELECT 1 FROM _prisma_migrations WHERE migration_name = '$migration' AND finished_at IS NOT NULL AND rolled_back_at IS NULL) THEN 'yes' ELSE 'no' END;") ||
    fail "Cannot read migration status for $migration."
  if [[ "$applied" == "yes" ]]; then
    echo "Already applied: $migration"
  elif [[ "$applied" == "no" ]]; then
    docker compose run --rm web npx prisma migrate resolve --applied "$migration" ||
      fail "Cannot reconcile $migration. Stop and inspect migration logs."
  else
    fail "Unexpected migration status for $migration: $applied"
  fi
done

echo "Step 5/8: Applying any other pending migrations"
docker compose run --rm web npx prisma migrate deploy ||
  fail "Other database migrations failed. Do not switch containers."

echo "Step 6/8: Checking generated Prisma client against real DB schema"
docker compose run --rm web node scripts/verify-exam-schema.js ||
  fail "Schema still differs from Prisma client. Do not switch containers."

echo "Step 7/8: Starting web/admin with the already built latest images"
docker compose up -d --no-build web admin ||
  fail "Container startup failed; inspect docker compose logs."

echo "Step 8/8: Checking subject page and containers"
sleep 2
# /subjects/* requires NextAuth. An anonymous curl must be sent to /login
# instead of rendering the subject page. Follow the redirect and verify that
# it ends at our login page (not a 500 or an unrelated redirect destination).
probe=$(curl -sS -L --max-redirs 3 -o /dev/null -w '%{http_code} %{url_effective}' --max-time 30 \
  http://127.0.0.1:3000/subjects/lich-su || true)
http_status=${probe%% *}
final_url=${probe#* }
docker compose ps
echo "Anonymous subject-page probe: HTTP $http_status, final URL: $final_url"
if [[ "$http_status" != "200" ]] || \
   [[ "$final_url" != "http://127.0.0.1:3000/login?callbackUrl=%2Fsubjects%2Flich-su" ]]; then
  echo "Unexpected redirect or application error; recent web logs follow:" >&2
  docker compose logs --tail=80 web >&2
  fail "Subject-page/auth flow did not reach the login page successfully. Database backup is at $backup."
fi
echo "RECOVERY OK: $before existing exams preserved; anonymous subject visit correctly redirects to a working login page."
echo "Database backup: $backup"
echo "To confirm the subject itself renders, open /subjects/lich-su in a browser after signing in."
