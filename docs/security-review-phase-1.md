# Phase 1 security review — Eduva

Review date: 2026-11-01
Branch: `improve/security-performance`
Status: Partial remediation; **not** a penetration test and not a production deployment sign-off.

## Confirmed findings and fixes

1. **Public privilege escalation via registration** (high). `src/app/api/auth/register/route.ts` accepted `TEACHER` in a public request and persisted it as the new user's role. The public endpoint now only accepts `STUDENT` (or no role), sets the persisted role explicitly to `STUDENT`, and tests reject teacher/admin injection. Admin-provisioned teacher accounts remain possible via privileged workflows.
2. **Stale admin-role JWT** (high). `requireAdmin()` previously trusted the JWT session role without refreshing it. The function now checks the user's current database role for each admin API call, so revocation is enforced on subsequent requests.
3. **Unvalidated registration input / inconsistent errors** (medium). Public registration now has a strict schema with bounded fields, normalized email, minimum 8-character password, and a bcrypt-compatible 72-byte password limit. Zod validation errors now result in HTTP 400 rather than HTTP 500.
4. **CI missing** (medium). The repository had tests but no `.github/workflows` workflow. Added GitHub Actions with a locked install, Prisma generation, TypeScript check, unit tests, and a high-severity production dependency audit.

## Pending work / risk acceptance needed

- **Admin mass-assignment**: `src/app/api/admin/[resource]/route.ts` and `[id]/route.ts` still pass raw body data to Prisma using `as never`. Restrict writes per resource with Zod allowlists; particularly review user roles, subscriptions and payment statuses. They are behind `requireAdmin()` but defense in depth is still needed.
- **Authentication abuse**: add IP + account-based rate limiting for login and registration using shared persistent storage, with bot protection and monitoring. Avoid memory-only counters on multi-instance deployments.
- **Payments**: audit every approval and entitlement transition, replay protection, and ensure only trusted confirmations can activate subscriptions. The checkout route already requires authentication, but that alone is not sufficient.
- **JWT role freshness beyond admin**: examine teacher-specific endpoints and ensure server-side authoritative role checks before privileged actions.
- **Admin standalone server**: review the separate `admin-server/server.js` (approximately 130 KB) for authentication, CSRF, input validation and upload handling.
- **File handling**: inspect upload MIME/content checks, file size limits, storage authorization, and downloading of private documents.
- **Dependency review**: review the pinned `xlsx@0.18.5` dependency and other results from `npm audit`. Do not upgrade major dependencies blindly; test compatibility.
- **Database**: verify encrypted offsite backups, restoration drills, least-privilege credentials and production migration workflow.
- **Deployment**: configure required PR checks and branch protections in GitHub repository settings. A CI workflow alone does not prevent bypass or direct pushes.

## Verification

- Added regression tests for registration privilege escalation and bad passwords.
- GitHub Actions runs against PRs targeting `main` and pushes on this feature branch.
- GitHub Actions PR #2: dependency installation, Prisma client generation, application TypeScript check, and unit tests passed. Production dependency audit **failed**; see details below.
- The existing `scripts/upsert-store-catalog.ts` imports a missing `src/data/store-catalog` module, which blocked the first CI typecheck. The app CI typecheck uses `tsconfig.ci.json` to exclude this one known-broken legacy maintenance script; the script remains broken and must be repaired or deleted before use.
- Audit on 2026-11-01 reported **11 production dependency vulnerabilities** (1 low, 1 moderate, 7 high, 2 critical). Affected packages include Next.js, NextAuth, KaTeX, Zod, SheetJS (`xlsx`), `sharp`, `postcss`, `@xmldom/xmldom`, `nanoid`, `uuid` and `source-map-js`. See GitHub Actions run 41294106588. Do not merge as production-ready with unresolved critical advisories.
- `npm audit` indicated suggested remediation targets `next@15.5.28`, `next-auth@4.24.15`, `katex@0.19.1`, `zod@4.6.7`; these are **not installed or verified** in this PR. `xlsx` had no npm-audit-supported fix and requires replacement or a separately verified safe distribution.
- This PR is intentionally **draft** and must not be merged without explicit owner review.
