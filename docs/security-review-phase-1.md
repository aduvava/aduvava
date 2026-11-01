# Eduva — Phase 1 hardening and pre-public security gate

**Reviewed:** 2026-11-01  
**Branch:** `improve/security-performance`  
**Draft PR:** https://github.com/aduvava/aduvava/pull/2  
**Approval:** No merge or auto-merge into `main` until explicitly approved by the owner.

## Fixes on this branch

- **Public signup:** always creates STUDENT accounts. Prevents self-service teacher/admin escalation, normalizes email and validates passwords.
- **Identity and RBAC:** authenticated API methods recheck current user/role in PostgreSQL. `getCurrentUser()` used by Server Components now also refreshes account existence and current DB role, so teacher/admin pages reject revoked sessions.
- **Student profile:** `GET /api/profile` uses an explicit Prisma select; it does not return `passwordHash`, OAuth accounts, or credentials.
- **Exam APIs:** `GET /api/exams/[id]` requires a session and `canAccessExam()`, including VIP and private-sharing grants. It exposes only safe exam and question fields, excluding share tokens, share password hashes, correct answers and explanations before submission. `GET /api/exams` filters unshared private exams and never exports share secrets.
- **Integrated Admin:** strict per-resource Zod field allowlists prevent mass assignment and nested Prisma writes. User credentials are excluded from payment API responses. Payment updates accept **status only**, cannot be deleted or created with PAID status, and are settled via the shared transactional service.
- **VIP payment reconciliation:** `src/lib/payment-transition.js` implements `Serializable` PostgreSQL transactions for status changes, VIP subscription creation and notification. A successful PAID payment stores its linked `vipSubscriptionId`; confirming the same payment twice is idempotent. PAID reversals and historical PAID rows without a verifiable linked subscription require manual reconciliation.
- **Standalone Admin:** both Admin interfaces use the exact same VIP settlement service. Admin form POST requests require a same-origin Origin/Referer, including login and bank confirmation. Secure admin session cookies are used when `ADMIN_PUBLIC_ORIGIN` is HTTPS. Keep the standalone Admin private behind a trusted HTTPS proxy, and set `ADMIN_PUBLIC_ORIGIN` to its externally reachable HTTPS origin.
- **Documents:** direct Next.js static access to user-uploaded documents is denied; DOCX HTML previews have a sandbox Content Security Policy. The same document privacy restrictions must be enforced at any external CDN/proxy.
- **Dependencies/CI:** Next.js 16.4.3, patched NextAuth/KaTeX/Zod, and replacement of SheetJS xlsx. Read-only CI checks TS, Node syntax, Prisma, tests, production build and dependency audit.

## Latest validated automated test results

- **Main CI**: https://github.com/aduvava/aduvava/actions/runs/41299005042 — **success**, 34/34 unit tests; TypeScript, standalone Admin syntax, production build and high/critical dependency audit passed.
- **Integration smoke**: https://github.com/aduvava/aduvava/actions/runs/41299005035 — **success** against disposable PostgreSQL 16, running both Next.js and standalone Admin Server.
- Integration covers private/protected PRO exam APIs, secret/answer-key non-disclosure, account profile redaction, login and database role revocation for Server Components, payment checkout pending without VIP, settled payment activation, repeat confirmation idempotency, PAID-reversal rejection, protected Admin form submissions and denied direct document static URLs.
- `npm audit --omit=dev --audit-level=high` passes but still reports **one moderate `baseline-browser-mapping` advisory**; the configured threshold does not check every possible issue.
- An automated green check is **not** an external penetration test or proof of production security.

## Remaining pre-public work

1. **Rate limits and abuse prevention:** add persistent IP/account throttling for public registration, login, password guessing, contact forms and exam password submissions; monitor anomalous traffic.
2. **Uploads and hosting:** verify file signatures and limits, ZIP document decompression limits, antivirus processing, and keep sensitive uploads private in every deployment layer. The Next.js proxy alone is insufficient when CDN/static hosting bypasses it.
3. **Manual payment operations:** train administrators to verify bank funds externally before clicking PAID. Review existing legacy PAID records for incomplete VIP activation; manual reconciliation is required. Add change history, refunds/reversals workflow and reconciliation reporting before collecting real money at scale.
4. **Standalone Admin hardening:** configure `ADMIN_PUBLIC_ORIGIN` and HTTPS, add login rate limits and intrusion monitoring, and audit all privileged upload operations and Admin forms. Admin sessions are in-memory; deployments must tolerate restart/session loss.
5. **Database and delivery:** independently verify backups, restore drills, least-privilege credentials, correct `NEXTAUTH_URL`, secrets, HTTPS, database migrations (`prisma migrate deploy`), GitHub required checks/branch protection and deployment rollback.
6. **Manual acceptance:** review actual student/teacher/Admin UI on desktop/mobile, XLSX import/export and real bank-reconciliation workflow on staging with realistic permissions. Automated API tests do not replace human browser QA.
7. **Other known gaps:** forgotten-password page is not functional; AI grading returns HTTP 503; legacy `scripts/upsert-store-catalog.ts` still imports a missing module; full production-scale/load tests are pending.

**Release recommendation:** Do not expose the standalone Admin server or accept live payments until operational/security checks above are addressed. Keep PR #2 Draft. Never merge without owner approval.
