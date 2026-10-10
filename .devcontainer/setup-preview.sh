#!/usr/bin/env bash
set -euo pipefail
cd /workspaces/aduvava

if [[ ! -f .env.local ]]; then
  if [[ -n "${CODESPACE_NAME:-}" ]]; then
    forwarding_domain="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
    preview_url="https://${CODESPACE_NAME}-3000.${forwarding_domain}"
  else
    preview_url="http://localhost:3000"
  fi

  admin_password="$(openssl rand -hex 18)"
  student_password="$(openssl rand -hex 18)"
  teacher_password="$(openssl rand -hex 18)"
  nextauth_secret="$(openssl rand -hex 32)"

  umask 077
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

set -a
. ./.env.local
set +a

npm ci
npm run db:generate
npm run db:push
npm run db:seed
printf '%s\n' 'Eduva test database is ready. Login details are in .codespaces-preview-credentials.'
