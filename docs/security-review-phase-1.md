# Eduva — Phase 1 security review (2026-11-01)

**Branch:** `improve/security-performance`  
**PR:** https://github.com/aduvava/aduvava/pull/2 (**DRAFT, not merged**)  
**Scope:** Source and CI review only. No deployed-system pentest, database backup verification or production acceptance.

## Fixes implemented on this branch

1. **Public registration privilege escalation:** Public signup no longer accepts a TEACHER or ADMIN role, persists STUDENT explicitly, bounds inputs and increases password minimum to eight characters / maximum 72 bcrypt UTF-8 bytes. Added regression tests.
2. **Stale JWT authorization:** Authenticated API requests now look up the current user and role in PostgreSQL so removed or downgraded users are no longer trusted based on stale JWT claims.
3. **Admin mass assignment:** Added strict Zod allowlists by resource for POST/PUT. This blocks arbitrary Prisma fields, nested relation writes and modification of balances and password hashes. Sensitive embedded user fields in payment and subscription read responses are restricted.
4. **Untrusted document access:** Next.js middleware blocks direct `/uploads/documents/` serving; document access must use authorized APIs. Preview HTML is returned with a sandboxed Content Security Policy. This must also be enforced on any CDN or reverse proxy exposing static files.
5. **Dependency vulnerability reduction:** Updated Next.js 15.5.19→15.5.28, NextAuth 4.24.14→4.24.15, KaTeX 0.17.0→0.19.1, Zod 3.25.76→4.6.7; replaced vulnerable SheetJS `xlsx@0.18.5` usage and removed the package. The admin user export is now Excel-readable CSV with formula-injection defenses. The exam editor uses `read-excel-file` and `write-excel-file` for .xlsx, and a capped CSV/TSV parser; legacy .xls is no longer supported.
6. **CI and tests:** Added a read-only GitHub Actions CI workflow checking locked install, Prisma, application TypeScript, 27 unit tests, production build and `npm audit --omit=dev --audit-level=high`. Temporary write-enabled npm-refresh workflows have been removed. The PR remains draft with no auto-merge.

## Latest verified CI results

- Typecheck and **27/27 unit tests passed** in the PostCSS compatibility experiment (run 41295271676).
- Next.js optimized production build **completed successfully** in that experiment (with an isolated, uncommitted PostCSS override). During prerender, it logged expected database connection errors because the test runner had no actual PostgreSQL server; deployment must be validated against an initialized database.
- The normal CI build step was added afterward; review the latest CI run on the PR for its independent result.
- The latest dependency scan after the above upgrades reported **2 production vulnerabilities (1 moderate, 1 high)**, down from **11 (including 2 critical)**. Both remaining items were reported against the PostCSS version nested under Next.js. `npm audit` still fails at `--audit-level=high`.
- A test override targeting PostCSS 8.5.31 **did not remove those reported vulnerabilities**, despite the rest of the compatibility tests and production build passing; the override was **not committed**. Consider a tested Next.js major upgrade or a supported upstream patch; do not silently downgrade the audit threshold.

## Known remaining risks and next steps

- **Production audit blocker:** Follow a supported Next.js/PostCSS remediation path and re-run the security audit, with build and integration tests.
- **Legacy catalog script:** `scripts/upsert-store-catalog.ts` imports the missing `src/data/store-catalog`; it remains broken. It is explicitly excluded from app TypeScript/build checks, not fixed. Repair or remove only after confirming whether it is still used.
- **Standalone admin server:** Its large HTTP implementation needs deeper security review for CSRF, brute-force protections, session cookie attributes, file imports, payment confirmations, and role changes. The integrated admin API allowlists do **not** protect this separate server.
- **Payment approvals and entitlements:** Review administrator confirmation flow, replay protection, subscription state transitions, audit trails and consistency with actual bank transfers.
- **Input and upload controls:** Add persistent rate limiting, content sniffing / archive decompression limits, file authorization tests and malware scanning where appropriate.
- **Database / operations:** Verify backups and restore drills, least-privilege credentials, migration deployment process and audit logs; configure required CI checks and main-branch protection in GitHub settings.
- **QA:** Run integration tests with an isolated PostgreSQL database, exercise teacher/admin role transitions, upload and download restrictions, all admin CRUD screens, and XLSX import/export.

**Release gate:** Keep this PR in Draft. Do not merge into `main` without owner approval; do not consider it production-ready while high-severity audit or remaining workflow risks persist.
