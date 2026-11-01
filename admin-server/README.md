# Ava Admin Server

This optional standalone administration server shares the project's PostgreSQL database and runs on port 4000.

Start it from the project root after configuring `.env` and initializing the database:

```bash
npm run admin:start
```

For Docker deployment, Compose binds the admin service to localhost on the host. Put it behind HTTPS and a reverse proxy if remote access is needed.

Create the administrator account with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`, then run `npm run db:seed`. The seed requires a password of at least 16 characters. No default admin login is shipped.

## Production security

Set `ADMIN_PUBLIC_ORIGIN` to the actual HTTPS origin (including scheme and host) whenever the standalone Admin runs behind a reverse proxy. Browser form POST requests are rejected unless their Origin or Referer matches; an HTTPS origin also enables `Secure` on the Admin session cookie. Preserve the external `Host` header or configure this setting explicitly. Never publish port 4000 directly to the Internet; keep it bound to loopback or a private network, then serve it only through a trusted HTTPS reverse proxy.

Mark a bank-transfer payment as **PAID** only after verifying funds with the banking provider. Payment status, activation subscription and notification are now saved in a serializable transaction. Repeated confirmation is idempotent; settled payments cannot be reverted through the Admin editor. Existing legacy PAID rows without a linked subscription ID require manual reconciliation, not automatic reactivation.

Back up database and uploads before production deployments, and run the integration CI with isolated test accounts and database. Do not use real payment credentials or customer data in CI.

## Rate limiting and upload safety

The shared `SecurityThrottle` table is created by the migration `20261101120000_security_throttle`. Run `npx prisma migrate deploy` against the target database before starting the web/Admin services. Auth requests and protected uploads fail closed if this table or database is unavailable. Limits are shared across replicas and identifiers are stored as HMAC hashes; expired rows are pruned opportunistically after a seven-day grace period.

Set `SECURITY_RATE_LIMIT_SECRET` to a distinct long random secret, or the application will reuse `NEXTAUTH_SECRET`. Enable `SECURITY_TRUST_PROXY_IP_HEADERS=true` **only** if the fronting proxy removes any client-supplied forwarding headers and replaces them with verified origin IPs. Without this guarantee, keep this setting false; email/account and global limits still apply. Do not publish the Admin port directly to the Internet.

PDF, DOCX, PPTX and motivation images are checked for signatures; ZIP-based Office files are constrained by entry counts, sizes and compression ratio. This is structural validation, **not malware scanning**. Use antivirus and/or a quarantine/approval workflow for public uploads, and enforce request-body limits at the reverse proxy.
