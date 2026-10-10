#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

configured_database_url="${DATABASE_URL:-}"
configured_nextauth_secret="${NEXTAUTH_SECRET:-}"
configured_admin_email="${SEED_ADMIN_EMAIL:-}"
configured_admin_password="${SEED_ADMIN_PASSWORD:-}"
configured_seed_switch="${EDUVA_SEED_DATABASE:-}"
configured_demo_seed="${EDUVA_SEED_DEMO_DATA:-}"

if [[ ! -f .env.local ]]; then
  if [[ -n "${CODESPACE_NAME:-}" ]]; then
    forwarding_domain="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
    preview_url="https://${CODESPACE_NAME}-3000.${forwarding_domain}"
  else
    preview_url="http://localhost:3000"
  fi

  nextauth_secret="${configured_nextauth_secret:-$(openssl rand -hex 32)}"

  umask 077
  if [[ -n "$configured_database_url" ]]; then
    # Keep the supplied Supabase URI in the environment instead of writing a secret to disk.
    printf '%s\n' \
      "NEXTAUTH_URL=${preview_url}" \
      "NEXTAUTH_SECRET=${nextauth_secret}" \
      'MOCK_PAYMENT_BASE_URL=http://localhost:3000' \
      > .env.local
  else
    admin_password="$(openssl rand -hex 18)"
    student_password="$(openssl rand -hex 18)"
    teacher_password="$(openssl rand -hex 18)"
    printf '%s\n' \
      'DATABASE_URL=postgresql://postgres:eduva_codespaces_only@db:5432/eduva?schema=public' \
      "NEXTAUTH_URL=${preview_url}" \
      "NEXTAUTH_SECRET=${nextauth_secret}" \
      'SEED_ADMIN_EMAIL=admin@eduva.local' \
      "SEED_ADMIN_PASSWORD=${admin_password}" \
      'SEED_DEMO_EMAIL=student@eduva.local' \
      "SEED_DEMO_PASSWORD=${student_password}" \
      'SEED_TEACHER_EMAIL=teacher@eduva.local' \
      "SEED_TEACHER_PASSWORD=${teacher_password}" \
      'EDUVA_SEED_DEMO_DATA=true' \
      'MOCK_PAYMENT_BASE_URL=http://localhost:3000' \
      > .env.local

    printf '%s\n' \
      'Temporary Codespaces test logins (private to this Codespace)' \
      '' \
      'Admin: admin@eduva.local' \
      "Admin password: ${admin_password}" \
      '' \
      'Student: student@eduva.local' \
      "Student password: ${student_password}" \
      '' \
      'Teacher: teacher@eduva.local' \
      "Teacher password: ${teacher_password}" \
      > .codespaces-preview-credentials
    chmod 600 .codespaces-preview-credentials
  fi
fi

set -a
. ./.env.local
set +a
if [[ -n "$configured_database_url" ]]; then export DATABASE_URL="$configured_database_url"; fi
if [[ -n "$configured_nextauth_secret" ]]; then export NEXTAUTH_SECRET="$configured_nextauth_secret"; fi
if [[ -n "$configured_admin_email" ]]; then export SEED_ADMIN_EMAIL="$configured_admin_email"; fi
if [[ -n "$configured_admin_password" ]]; then export SEED_ADMIN_PASSWORD="$configured_admin_password"; fi
if [[ -n "$configured_seed_switch" ]]; then export EDUVA_SEED_DATABASE="$configured_seed_switch"; fi

is_supabase_database=false
if [[ "${DATABASE_URL:-}" == *supabase.com* || "${DATABASE_URL:-}" == *supabase.co* ]]; then
  is_supabase_database=true
fi

npm ci --include=dev --include=optional --no-audit --no-fund
npm run db:generate
npm run db:push
if [[ "$is_supabase_database" == true ]]; then
  if [[ "$configured_seed_switch" == "true" ]]; then
    if [[ -z "$configured_admin_email" || -z "$configured_admin_password" ]]; then
      printf '%s\n' 'Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD as Codespaces secrets before seeding Supabase.' >&2
      exit 1
    fi
    if [[ "$configured_demo_seed" == "true" ]]; then
      export EDUVA_SEED_DEMO_DATA=true
    else
      export EDUVA_SEED_DEMO_DATA=false
    fi
    npm run db:seed
    printf '%s\n' 'Supabase admin seed completed. Demo content was inserted only when EDUVA_SEED_DEMO_DATA=true.'
  else
    printf '%s\n' 'Supabase schema is ready. Demo/admin seed was skipped; set EDUVA_SEED_DATABASE=true to run it intentionally.'
    printf '%s\n' 'Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD before seeding to create the intended admin account.'
  fi
  printf '%s\n' 'Codespaces is using the configured Supabase database. No temporary demo login credentials are available.' > .codespaces-preview-credentials
  chmod 600 .codespaces-preview-credentials
else
  npm run db:seed
  printf '%s\n' 'Eduva test database is ready. Login details are in .codespaces-preview-credentials.'
fi
