# Eduva

Eduva is a full-stack Next.js 16 application using PostgreSQL and Prisma. It includes the student site, NextAuth login, a role-protected admin area, and an optional standalone admin server.

## Supabase Postgres setup

The app uses Prisma with PostgreSQL for accounts, exams, attempts, and admin data. Use the dedicated Eduva Supabase project so its schema and records stay separate from other apps. In Supabase, open **Connect**, copy the **Session pooler** connection URI (port `5432`), and put it in `DATABASE_URL` in `.env`. Do not put a database password or any privileged key in a `NEXT_PUBLIC_` variable. In Codespaces, add the URI as the `DATABASE_URL` Codespaces secret; setup applies the Prisma schema without creating sample content.

Copy `.env.example` to `.env`, then set `NEXTAUTH_SECRET` and `NEXTAUTH_URL`. To create the schema, run:

```bash
npm ci
npm run db:generate
npm run db:push
```

The seed step is optional. `npm run db:seed` provisions only the admin account from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`. It never inserts sample students, exams, rankings, or documents. Use a unique admin password of at least 16 characters.

Google login is optional. To enable it, configure the OAuth client ID and secret in `.env`, set the JavaScript origin to the site URL, and add `<NEXTAUTH_URL>/api/auth/callback/google` as an authorized redirect URI.

## Google sign-in (student onboarding)

Eduva already supports the Google OAuth provider in NextAuth. On both `/login` and `/register`, learners can choose Google before entering any academic details. Once Google verifies their account, Eduva collects their grade, school and province on `/onboarding` and saves them on the existing student profile. Returning students whose profile is complete go straight to their requested page. Goals/aspirations are optional. New OAuth users always start with the `STUDENT` role; only admins can promote users.

For the public HTTPS domain:

1. In **Google Cloud Console**, configure the OAuth consent screen and create a **Web application** OAuth client. Configure the authorized JavaScript origin as your site's actual HTTPS origin, e.g. `https://educhi.xyz`.
2. Add the **exact** Google redirect URI `https://educhi.xyz/api/auth/callback/google` (replace the hostname if your production domain differs).
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the server's private `.env` file; ensure `NEXTAUTH_URL=https://educhi.xyz` and a strong `NEXTAUTH_SECRET`. Never commit the client secret or expose it via `NEXT_PUBLIC_`.
4. Restart/redeploy the web service so the new environment is loaded. Test with a **new Google account** and then with the same returning account, both on mobile and desktop.
5. If Google shows `OAuthAccountNotLinked`, the email already belongs to an Eduva account created with a password. Sign in with that **existing email and password** once; Eduva opens `/account/link-google`. Choose the **same verified Google email** and click “Liên kết tài khoản Google”. Future Google sign-ins return to the **same user ID and existing data**, without another registration. You may skip linking and continue with a password.
6. Never enable `allowDangerousEmailAccountLinking` or auto-merge by email. The linking screen requires a valid signed-in Eduva account, and the OAuth callback rejects unverified or mismatched Google email addresses. An admin or staff member should not merge databases/users manually. Google consent must be verified on the live production domain; CI checks the credential-to-linking flow but cannot complete Google's external OAuth without credentials.

Without both Google environment variables, the Google button remains visible but disabled with an explanatory message. The GitHub build and browser CI tests cannot validate a live Google consent flow; an authorized browser test with real OAuth credentials is still required before declaring production Google sign-in operational.

## Local setup

1. Install Node.js 20.9 or newer (Node.js 22 recommended).
2. Configure `.env` as described above.
3. Install dependencies and generate the Prisma client:

   ```bash
   npm ci
   npm run db:generate
   ```

4. Create/update the database schema:

   ```bash
   npm run db:push
   ```

5. Start the student web app with `npm run dev`. It runs at `http://localhost:3000`. To start the separate admin server, use `npm run admin:start` on port 4000.

## Docker deployment

1. Copy `.env.example` to `.env` and replace the placeholders. Set `NEXTAUTH_URL` to the public HTTPS URL before building. Use a long alphanumeric `POSTGRES_PASSWORD` and a unique `NEXTAUTH_SECRET`.
2. Start services with `docker compose up -d --build`.
3. Initialize the database once:

   ```bash
   docker compose exec web npx prisma migrate deploy
   docker compose exec web npm run db:seed
   ```

The web app is on port 3000. The standalone admin service binds to host localhost port 4000; keep it private behind a trusted HTTPS reverse proxy and set ADMIN_PUBLIC_ORIGIN to its exact public HTTPS origin. Protect sensitive documents in any external web server/CDN; direct access to /uploads/documents/ is blocked only at the Next.js proxy layer. Verify database and upload backups before deploying. PostgreSQL and uploaded files use persistent Docker volumes.

The seed requires `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` and creates only that administrator account. No default password or sample content is shipped.

## Temporary GitHub preview (Codespaces)

This is a private test environment. By default it starts the Next.js app with a separate temporary PostgreSQL database and creates only a temporary Admin account. To test against the dedicated Eduva Supabase project, configure the `DATABASE_URL` Codespaces secret first; setup applies the app schema but does not seed users or content by default. To create the first Admin, set `EDUVA_SEED_DATABASE=true`, `SEED_ADMIN_EMAIL`, and `SEED_ADMIN_PASSWORD` as Codespaces secrets.

1. Open the repository on GitHub, choose **Code → Codespaces → Create codespace on main**.
2. Wait for setup to finish. The student site opens on port **3000**; the standalone admin site opens on port **4000** from the **Ports** panel. The integrated admin panel is also available at `/admin` on port 3000.
3. For the temporary local database, run `cat .codespaces-preview-credentials` to see generated test logins. With Supabase, that file only notes the selected database; use the admin email and password configured in Codespaces secrets if you ran the admin seed.
4. Stop the Codespace from GitHub when you finish testing. Its database belongs only to that temporary Codespace; deleting the Codespace deletes its test data.

The forwarded port is private by default, so only you can view it while signed in to GitHub. Codespaces use metered compute and storage; personal GitHub Free accounts currently include 120 core-hours and 15 GB-month of storage, and paid usage can apply if you go beyond included limits and have billing enabled. See [GitHub Codespaces billing](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces).

If setup previously stopped with `npm error Invalid Version` or the app reports `next: not found`, update the existing Codespace and rerun setup before starting the preview:

```bash
git pull --ff-only origin main && bash .devcontainer/setup-preview.sh && bash .devcontainer/start-preview.sh
```

The repaired lockfile includes complete optional dependency metadata for Linux and other platforms. Setup installs development and optional dependencies explicitly. Startup retries setup when Next.js is missing and reports a server exit immediately.

### Public deployment security gates

### Exam/API security hardening (November 2026)

The exam deadline is calculated from the immutable attempt start time and exam duration **on the server**. The additive `Attempt.extraTimeSeconds` column persists any paid extra-time helper, with at most 60 minutes of extension; expired answers and helper activations are rejected. A late submission may still grade answers saved before the deadline, but cannot introduce late answers.

User exam creation is limited to **30 requests/hour per account**, **120/hour per trusted client IP** (when properly configured), and **3000/hour globally**; the JSON request body is capped at 1 MiB. Question and invitation fields are also bounded. The existing `SecurityThrottle` migration must already be installed. Exam-sharing edits revoke all previously acquired grants and restore **only** emails explicitly invited in that edit; rotating a password invalidates existing password unlocks. Previously started attempts and results are denied after the user loses sharing permission.

External Markdown image URLs are not fetched; use trusted same-origin image paths, or inline PNG/JPEG/WebP/GIF raster images smaller than 250KB (the creator enforces this limit). SVG, external trackers and unbounded data URLs are blocked. Production CSP, HSTS, frame protection, nosniff and referrer restrictions are applied by the student app and standalone Admin. If an external CDN/reverse proxy replaces response headers, preserve or strengthen these policies there.

**Zero-data-loss rolling deployment (Docker Compose):**

```bash
cd /opt/eduva
# Verify a fresh database + uploads backup before continuing.
git pull --ff-only origin main
docker compose build web admin
# Additive migration runs BEFORE switching the running application containers.
docker compose run --rm web npx prisma migrate deploy
docker compose up -d --no-build web admin
docker compose exec -T web node scripts/public-launch-preflight.js
docker compose ps
```

Do not use `prisma db push --force-reset` or `docker compose down -v` in production. The PostgreSQL migration adds a NOT NULL column with a default; it does not delete existing attempts or documents. Keep the malware scanner running (`docker compose --profile malware-scanning up -d clamav` where needed). After rollout, verify real HTTPS, certs, reverse-proxy upload limits, Nginx header preservation, port 4000 loopback/private access, and OAuth login on the public domain. **Merging into main does not deploy to the VPS automatically.**

Run `npx prisma migrate deploy` (including the SecurityThrottle migration) before serving traffic. Apply HTTPS, private-file rules and upload size limits at every reverse proxy/CDN. Enable `SECURITY_TRUST_PROXY_IP_HEADERS` only behind a proxy that strips untrusted forwarding headers; the application otherwise uses account/global throttle buckets. Configure `ADMIN_PUBLIC_ORIGIN` for the standalone Admin service and keep port 4000 private. Validate uploaded files with antivirus; structural signatures and ZIP limits do not detect every threat. Back up and restore-test PostgreSQL and uploads before launch.

### Private documents and virus scanning (pre-public hardening)

New document uploads are stored outside `public/` (default `./storage/documents`). Older deployments must migrate existing `public/uploads/documents` files using the reviewed `scripts/migrate-document-storage.js` command after a verified backup. Document uploads and approvals in production require a clean ClamAV scan; if clamd is offline they fail closed. The optional Docker Compose ClamAV service is enabled with `docker compose --profile malware-scanning up -d --build`; ClamAV port 3310 is **not** published to the Internet.

Run `docker compose exec web node scripts/public-launch-preflight.js` on the configured production host, then complete external TLS, CDN, backups, bank and browser acceptance separately. Read [the private storage and malware scanning runbook](docs/private-storage-malware-runbook.md) for migration and scanner setup. Keep the security PR Draft until explicit owner review.
