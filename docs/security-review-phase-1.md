# Eduva — Pre-public security review (2026-11-01)

**Repository:** `aduvava/aduvava`  
**Branch:** `improve/security-performance`  
**PR:** https://github.com/aduvava/aduvava/pull/2 (**DRAFT — do not merge without owner approval**)  
**Scope:** Source remediation, automated unit and isolated integration verification. Not an independent penetration test or production certification.

## Implemented security improvements

1. **Identity and permissions:** Public signup always creates STUDENT; user-facing APIs and protected Server Components recheck live account existence and role in PostgreSQL rather than trusting JWT claims. Teacher/Admin revocation takes effect on subsequent requests. Login input is validated and both credential and standalone Admin login are throttled.
2. **Privacy and exam access:** `GET /api/profile` only selects safe fields (never `passwordHash` or OAuth tokens). Exam detail APIs require login, subscription entitlement and sharing grants; exam list excludes unshared private exams. Answer keys, explanations, `shareToken` and `sharePasswordHash` are not sent to students before submission.
3. **Admin APIs:** Zod allowlists reject arbitrary Prisma mass-assignment writes and nested relation updates. Payment read responses omit user password hashes. Admin payment status edits use a shared transactional service; direct PAID creation, deletion and reversing settled payments are rejected.
4. **VIP settlement:** Next.js Admin and the standalone Admin use one serializable PostgreSQL transaction to set PAID status, create VIP subscription, store a subscription link and notify the user. Reconfirming a settled payment is idempotent. Legacy PAID rows without links require human reconciliation. Administrators must verify the **actual bank transfer** before marking PAID.
5. **Standalone Admin:** Same-origin checks reject cross-site POSTs including payment confirmation, cookies use Secure with an HTTPS `ADMIN_PUBLIC_ORIGIN`, rate limits protect login, request bodies are bounded while streaming, stack traces are not returned to clients, and motivation image uploads check file signatures/basic dimensions.
6. **User uploads:** Both upload interfaces verify PDF signatures and OOXML ZIP structure for DOCX/PPTX, prevent archive traversal/macro entries, and enforce limits on size, entry count and expansion ratio. Pending files remain private in application routes; DOCX preview HTML uses a sandbox CSP. The same restrictions must be implemented at CDN/reverse-proxy level.
7. **Abuse prevention:** Migration `20261101120000_security_throttle` creates persistent Postgres rate buckets for credentials attempts, signup, exam-password guessing, contact, document upload and checkout. Atomic SQL operations apply across replicas; identifiers are HMAC-hashed, and only trusted proxies may enable X-Forwarded-For parsing.
8. **Runtime and dependencies:** Next.js updated to `16.4.3`, NextAuth to `4.24.15`, patched KaTeX and Zod, vulnerable `xlsx` replaced with `read-excel-file` / `write-excel-file` and guarded CSV. PostCSS updated to `8.5.32`; `baseline-browser-mapping` updated to `2.11.34`. Temporary dependency migration workflows removed; permanent CI permissions are read-only.

## Verified results on the final review commit

- **Main CI:** https://github.com/aduvava/aduvava/actions/runs/41300859987 — **SUCCESS** on SHA `37c3a298bf44f49e406b0fe41ea7a87d739f84eb`.
- **PostgreSQL integration:** https://github.com/aduvava/aduvava/actions/runs/41300860034 — **SUCCESS** on the same SHA, using disposable PostgreSQL 16 and both Admin implementations.
- **Unit tests:** **45 passed, 0 failed**. Prisma generation and migrations, TypeScript check, standalone Node syntax, Next.js production build, and integration tests passed.
- **Dependency scan:** `npm audit --audit-level=moderate` reported **0 vulnerabilities across all installed dependencies**, including build tooling, in this successful CI run. This does not guarantee vulnerabilities will not be discovered later.
- **Integration coverage:** credentials, role revocation on protected pages and APIs, PRO/private exams, profile redaction, two Admin VIP approval paths with idempotency and CSRF protection, contact HTTP 429 with Retry-After, shared database throttle buckets, PDF spoofing rejection and private-file authorization.
- These are controlled CI results; production CDN, infrastructure, passwords, backups, payment/bank integrations and user browsers have **not** been inspected or exercised in the actual deployment.

## Operational gates still required before going public

1. **Staging and secrets:** Configure TLS, strong and unique secrets, correct `NEXTAUTH_URL`, secure `DATABASE_URL`, private standalone Admin port, and exact HTTPS `ADMIN_PUBLIC_ORIGIN`. Run `npx prisma migrate deploy` before starting the upgraded apps. Set `SECURITY_TRUST_PROXY_IP_HEADERS=true` ONLY if your reverse proxy strips all client-supplied forwarding headers.
2. **Malware scanning and storage:** Structural PDF/OOXML validation **is not antivirus**. Add malware scanning/quarantine before releasing user files; enforce body limits and document privacy in every CDN/reverse-proxy origin and store files on persistent, access-controlled storage.
3. **Backup / restore:** Verify off-site PostgreSQL and upload backups with an actual restore drill. Prepare a migration/rollout rollback procedure, rotate any exposed secrets and test logs/monitoring/alerts.
4. **Bank payments:** Confirm the operator can reconcile transfers by amount/reference, handle refunds/disputes and maintain a durable audit trail. Investigate preexisting PAID payments missing `vipSubscriptionId` before accepting real money.
5. **Browser and abuse testing:** Manually test student, teacher and Admin journeys on mobile/desktop, real file submissions, XLSX import/export, session expiration, failed login limits and user-facing error messages. Functional password recovery remains incomplete; AI grading is currently unavailable.
6. **Release governance:** Require PR code review plus the main CI and PostgreSQL security smoke checks on protected `main`, verify production configuration, and get explicit owner approval before merge/deployment. No auto-merge was enabled.

## Launch decision

Automated unit, integration, production build and dependency checks are now green. **This is not yet a production launch sign-off:** operational security, malware scanning, backup restoration and bank reconciliation need deployment-specific verification. Keep this PR in Draft until the owner reviews it and authorizes merge.
