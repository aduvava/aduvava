# Ava Admin Server

This optional standalone administration server shares the project's PostgreSQL database and runs on port 4000.

Start it from the project root after configuring `.env` and initializing the database:

```bash
npm run admin:start
```

For Docker deployment, Compose binds the admin service to localhost on the host. Put it behind HTTPS and a reverse proxy if remote access is needed.

Create the administrator account with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`, then run `npm run db:seed`. The seed requires a password of at least 16 characters. No default admin login is shipped.
