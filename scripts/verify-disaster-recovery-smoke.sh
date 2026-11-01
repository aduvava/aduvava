#!/usr/bin/env bash
set -Eeuo pipefail

# Safely test a real PostgreSQL dump/restore and private-upload archive roundtrip.
# This script operates ONLY on an explicitly provided disposable GitHub Actions
# PostgreSQL service container; it never connects to DATABASE_URL or production.
if [[ "${RECOVERY_CI_ONLY:-}" != "yes" || -z "${PG_CONTAINER:-}" ]]; then
  echo "Refusing: this script requires RECOVERY_CI_ONLY=yes and an isolated PG_CONTAINER" >&2
  exit 2
fi
if [[ "${RECOVERY_DB:-}" != "eduva_recovery_test" || "${RESTORE_DB:-}" != "eduva_recovery_restored" ]]; then
  echo "Refusing any database name other than disposable recovery test names" >&2
  exit 2
fi

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

docker exec "$PG_CONTAINER" psql -U postgres -d eduva_recovery_test -v ON_ERROR_STOP=1   -c 'CREATE TABLE recovery_fixture (id integer primary key, marker text NOT NULL);'   -c "INSERT INTO recovery_fixture VALUES (1, 'isolated-eduva-recovery-fixture');"

# Binary custom-format PostgreSQL dump. A nonempty, checksum-stable backup
# is subsequently restored to a DIFFERENT disposable database.
docker exec "$PG_CONTAINER" pg_dump -U postgres -d eduva_recovery_test --format=custom   --no-owner --no-acl > "$tmpdir/eduva.dump"
test -s "$tmpdir/eduva.dump"
sha256sum "$tmpdir/eduva.dump" > "$tmpdir/eduva.dump.sha256"
(cd "$tmpdir" && sha256sum --check eduva.dump.sha256)

docker exec "$PG_CONTAINER" createdb -U postgres eduva_recovery_restored
docker exec -i "$PG_CONTAINER" pg_restore -U postgres -d eduva_recovery_restored   --no-owner --no-acl --exit-on-error < "$tmpdir/eduva.dump"
verified="$(docker exec "$PG_CONTAINER" psql -U postgres -d eduva_recovery_restored -Atc   "SELECT marker FROM recovery_fixture WHERE id=1")"
test "$verified" = "isolated-eduva-recovery-fixture" || {
  echo "Restored database fixture did not match" >&2
  exit 1
}

mkdir -p "$tmpdir/source/storage/documents" "$tmpdir/restored"
printf 'harmless synthetic document bytes\n' > "$tmpdir/source/storage/documents/eduva-recovery-fixture.pdf"
tar -czf "$tmpdir/private-documents.tar.gz" -C "$tmpdir/source" storage/documents
sha256sum "$tmpdir/private-documents.tar.gz" > "$tmpdir/private-documents.tar.gz.sha256"
(cd "$tmpdir" && sha256sum --check private-documents.tar.gz.sha256)
tar -xzf "$tmpdir/private-documents.tar.gz" -C "$tmpdir/restored"
cmp "$tmpdir/source/storage/documents/eduva-recovery-fixture.pdf"     "$tmpdir/restored/storage/documents/eduva-recovery-fixture.pdf"

echo "Disposable recovery passed: pg_dump, SHA-256, isolated pg_restore, archive checksum, private-document restore."
echo "NOTE: No production database, storage volume, encryption key or off-site backup was verified."
