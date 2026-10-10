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
