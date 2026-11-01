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
6. **User uploads and malware scanning:** Both upload interfaces verify PDF signatures and OOXML ZIP structure for DOCX/PPTX, prevent archive traversal/macro entries, and enforce strict size/expansion limits. Uploaded files now live exclusively in private storage outside `public/` and can be read only after API authorization. Production uploads and document approvals use ClamAV INSTREAM and fail closed without a clean scan. Legacy data is migrated by a separate checksum-verified tool. DOCX preview HTML uses sandbox CSP; edge/CDN restrictions must still be verified.
7. **Abuse prevention:** Migration `20261101120000_security_throttle` creates persistent Postgres rate buckets for credentials attempts, signup, exam-password guessing, contact, document upload and checkout. Atomic SQL operations apply across replicas; identifiers are HMAC-hashed, and only trusted proxies may enable X-Forwarded-For parsing.
8. **Deployment safety:** Added a private ClamAV Docker Compose profile, a reproducible private-document migration runbook, and a production preflight that checks HTTPS URLs, secret quality, database migration state, storage read/write and a live benign ClamAV scan. The preflight is read-mostly and does not certify edge TLS, backups, bank operations or pen testing.
9. **Runtime and dependencies:** Next.js updated to `16.4.3`, NextAuth to `4.24.15`, patched KaTeX and Zod, vulnerable `xlsx` replaced with `read-excel-file` / `write-excel-file` and guarded CSV. PostCSS updated to `8.5.32`; `baseline-browser-mapping` updated to `2.11.34`. Temporary dependency migration workflows removed; permanent CI permissions are read-only.

## Verified results on the previous completed integration and CI run

- **Main CI:** https://github.com/aduvava/aduvava/actions/runs/41302579197 — **SUCCESS** on SHA `4ececc966e741ecfcc1fe81db9572f265a1a74a0` (prior to the last CI syntax-only extension).
- **PostgreSQL integration:** https://github.com/aduvava/aduvava/actions/runs/41302579231 — **SUCCESS** on the same SHA, using disposable PostgreSQL 16 and both Admin implementations.
- **Unit tests:** **55 passed, 0 failed**. Prisma generation and migrations, TypeScript check, standalone Node syntax, Next.js production build, and integration tests passed.
- **Dependency scan:** `npm audit --audit-level=moderate` reported **0 vulnerabilities across all installed dependencies**, including build tooling, in this successful CI run. This does not guarantee vulnerabilities will not be discovered later.
- **Integration coverage:** credentials, role revocation on protected pages and APIs, PRO/private exams, profile redaction, two Admin VIP approval paths with idempotency and CSRF protection, contact HTTP 429 with Retry-After, shared database throttle buckets, PDF spoofing rejection, private-file authorization and authenticated Admin moderation + download/preview from non-public storage. ClamAV scan behavior was separately tested with a fake local clamd; live vendor scanner in staging remains unverified.
- These are controlled CI results; production CDN, infrastructure, passwords, backups, payment/bank integrations and user browsers have **not** been inspected or exercised in the actual deployment.

## Operational gates still required before going public

1. **Staging and secrets:** Configure TLS, strong and unique secrets, correct `NEXTAUTH_URL`, secure `DATABASE_URL`, private standalone Admin port, and exact HTTPS `ADMIN_PUBLIC_ORIGIN`. Run `npx prisma migrate deploy` before starting the upgraded apps. Set `SECURITY_TRUST_PROXY_IP_HEADERS=true` ONLY if your reverse proxy strips all client-supplied forwarding headers.
2. **Malware scanner and storage:** The ClamAV integration has been implemented in code but must be started and tested against a **real scanner** on staging before live traffic. Migrate all legacy files, confirm antivirus definitions are current and that malware detection/unavailability blocks uploads and approvals. Enforce body limits and private-file rules in every CDN/reverse-proxy origin; test persistent storage mounts and access rights. See [upload/ClamAV runbook](private-storage-malware-runbook.md).
3. **Backup / restore:** Verify off-site PostgreSQL and upload backups with an actual restore drill. Prepare a migration/rollout rollback procedure, rotate any exposed secrets and test logs/monitoring/alerts.
4. **Bank payments:** Confirm the operator can reconcile transfers by amount/reference, handle refunds/disputes and maintain a durable audit trail. Investigate preexisting PAID payments missing `vipSubscriptionId` before accepting real money.
5. **Browser and abuse testing:** Manually test student, teacher and Admin journeys on mobile/desktop, real file submissions, XLSX import/export, session expiration, failed login limits and user-facing error messages. Functional password recovery remains incomplete; AI grading is currently unavailable.
6. **Release governance:** Require PR code review plus the main CI and PostgreSQL security smoke checks on protected `main`, verify production configuration, and get explicit owner approval before merge/deployment. No auto-merge was enabled.

## Launch decision

Automated unit, integration, production build and dependency checks passed on the prior completed source commit. **This is not yet a production launch sign-off:** real ClamAV scanning, operational security, backup restoration and bank reconciliation need deployment-specific verification. Run `node scripts/public-launch-preflight.js` on the configured host, then complete edge/CDN and business-process checks separately. Keep this PR in Draft until the owner reviews it and authorizes merge.
