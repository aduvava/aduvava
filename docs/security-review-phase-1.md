# Eduva — Phase 1 security review and Next.js 16 migration

**Date:** 2026-11-01  
**Branch:** `improve/security-performance`  
**Draft PR:** https://github.com/aduvava/aduvava/pull/2  
**Release gate:** Do not merge or auto-merge without explicit owner approval.

## Implemented security improvements

1. **Registration:** Reject self-assigned `TEACHER`/`ADMIN` roles. All public accounts are created as `STUDENT`. Normalize emails, check password length, and use strict validation.
2. **Authentication and RBAC:** Recheck account existence and current roles from the database on authenticated API calls, preventing stale JWT claims from retaining server-side elevated permissions.
3. **Admin API:** Strict Zod allowlists for POST/PUT, preventing arbitrary Prisma updates, nested relation writes, and balance/password-hash assignment. Restrict embedded user fields returned from payment/subscription admin endpoints.
4. **Documents:** Block direct URLs under `/uploads/documents/` via the Next.js request proxy; preview HTML uses sandboxed Content Security Policy. Apply equivalent private-file rules to any external CDN/reverse proxy.
5. **Excel and CSV:** Remove vulnerable SheetJS `xlsx`. Use `read-excel-file` and `write-excel-file` for `.xlsx`; use safe, bounded CSV/TSV import and formula-safe CSV for Admin exports. Legacy `.xls` is no longer supported.
6. **Dependency updates:** Next.js `15.5.19` → `16.4.3`, NextAuth `4.24.14` → `4.24.15`, KaTeX `0.17.0` → `0.19.1`, Zod `3.25.76` → `4.6.7`. Upgrade to Node `>=20.9` for Next.js 16.
7. **Next.js 16 migration:** Rename `src/middleware.ts` to `src/proxy.ts`, preserving access checks, and verify Turbopack production compilation.
8. **CI:** Read-only workflow verifies locked install, Prisma client generation, TypeScript, all unit tests, production build, and production dependency audit at High/Critical threshold. Separate isolated PostgreSQL integration workflow exercises the running web app.

## Verified results on the feature branch

- **Main CI:** https://github.com/aduvava/aduvava/actions/runs/41296633395 — **success**.
- **Security integration smoke:** https://github.com/aduvava/aduvava/actions/runs/41296633425 — **success** with isolated PostgreSQL 16.
- Main CI passed `npm ci`, Prisma, TypeScript, unit tests (including XLSX round-trip), `npm run build`, and `npm audit --omit=dev --audit-level=high`.
- Integration tests verified student registration, NextAuth credentials login, rejection of unauthorized Admin access, payment creation with `PENDING` status and no subscription, rejection of Admin mass assignment, authorized role changes, administrator role revocation despite a stale JWT, and direct upload URL protection.
- The previous **1 High + 1 Moderate** PostCSS/Next.js findings no longer fail the upgraded production audit. A successful audit at the configured threshold does not mean the full dependency graph has zero low/moderate advisories or that a penetration test has been completed.
- Temporary dependency-refresh workflows were removed after their work. Both permanent workflows operate with `contents: read` only.

## Known limitations and follow-up risks

- **Standalone admin server:** `admin-server/server.js` is separate from the Next.js Admin APIs and still needs in-depth CSRF, authentication rate-limiting, cookie security, file-import, and privileged transaction review. Next.js resource allowlists do not automatically apply to it.
- **Payments:** Manual bank-transfer confirmation, replay resistance, audit trail, and VIP entitlement activation need focused transactional/security review; the smoke test only covers the pending checkout path.
- **Uploads:** Validate uploaded file contents, not just extensions/MIME; deploy malware scanning and enforce document privacy in any CDN/reverse proxy. Sandbox preview restricts HTML but is not antivirus.
- **Authorization:** Test access control throughout teacher-specific views and admin operations, not only the API smoke cases. User-interface proxy checks can still reflect a stale JWT; server APIs use current database roles.
- **Operational security:** Add persistent IP/account rate limits, secret scanning, branch protection/required checks, database backups and restore drills. These have not been verified in the connected production environment.
- **Legacy script:** `scripts/upsert-store-catalog.ts` still imports a missing `src/data/store-catalog`; excluded from the application typecheck and build, not repaired.
- **End-to-end QA:** Browser-based login and XLSX UI testing, payment reconciliation, real deployment, real SMTP/OAuth, and production database tests were not performed.

**Owner review required before merging into `main`.**
