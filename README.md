# Eduva

Eduva is a full-stack Next.js 15 application using PostgreSQL and Prisma. It includes the student site, NextAuth login, a role-protected admin area, and an optional standalone admin server.

## Local setup

1. Install Node.js 20 or newer and PostgreSQL.
2. Copy `.env.example` to `.env`. Set `DATABASE_URL`, `NEXTAUTH_SECRET`, and the administrator seed email and password. Use a unique password with at least 16 characters.
3. Install dependencies and generate the Prisma client:

   ```bash
   npm ci
   npm run db:generate
   ```

4. Create/update the database schema and seed initial catalog data:

   ```bash
   npm run db:push
   npm run db:seed
   ```

5. Start the student web app with `npm run dev`. It runs at `http://localhost:3000`. To start the separate admin server, use `npm run admin:start` on port 4000.

Google login is optional. To enable it, configure the OAuth client ID and secret in `.env`, set the JavaScript origin to the site URL, and add `<NEXTAUTH_URL>/api/auth/callback/google` as an authorized redirect URI.

## Docker deployment

1. Copy `.env.example` to `.env` and replace the placeholders. Set `NEXTAUTH_URL` to the public HTTPS URL before building. Use a long alphanumeric `POSTGRES_PASSWORD` and a unique `NEXTAUTH_SECRET`.
2. Start services with `docker compose up -d --build`.
3. Initialize the database once:

   ```bash
   docker compose exec web npm run db:push
   docker compose exec web npm run db:seed
   ```

The web app is on port 3000. The standalone admin service binds to host localhost port 4000; keep remote access behind a trusted HTTPS reverse proxy. PostgreSQL and uploaded files use persistent Docker volumes.

The seed requires `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`. Optional demo/teacher passwords are random when omitted; no default administrator password is shipped.

## Temporary GitHub preview (Codespaces)

This is a private, temporary test environment. It starts the Next.js app with a separate PostgreSQL database; it is not the production deployment.

1. Open the repository on GitHub, choose **Code → Codespaces → Create codespace on main**.
2. Wait for setup to finish. The student site opens on port **3000**; the standalone admin site opens on port **4000** from the **Ports** panel. The integrated admin panel is also available at `/admin` on port 3000.
3. To see the test logins, run `cat .codespaces-preview-credentials` in the terminal. The passwords are generated separately for this Codespace and are not committed.
4. Stop the Codespace from GitHub when you finish testing. Its database belongs only to that temporary Codespace; deleting the Codespace deletes its test data.

The forwarded port is private by default, so only you can view it while signed in to GitHub. Codespaces use metered compute and storage; personal GitHub Free accounts currently include 120 core-hours and 15 GB-month of storage, and paid usage can apply if you go beyond included limits and have billing enabled. See [GitHub Codespaces billing](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces).

If setup previously stopped with `npm error Invalid Version` or the app reports `next: not found`, update the existing Codespace and rerun setup before starting the preview:

```bash
git pull --ff-only origin main && bash .devcontainer/setup-preview.sh && bash .devcontainer/start-preview.sh
```

The repaired lockfile includes complete optional dependency metadata for Linux and other platforms. Setup installs development and optional dependencies explicitly. Startup retries setup when Next.js is missing and reports a server exit immediately.
