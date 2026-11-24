"use strict";
// Run privately on the verified Educhi deployment, never against a guessed project.
// Read-only, outputs schema metadata and aggregate account counts, never credentials or user IDs.
const { PrismaClient } = require("@prisma/client");
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const db = new PrismaClient();
  try {
    const report = await db.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const identity = await tx.$queryRaw`SELECT to_regclass('public."User"')::text AS users, to_regclass('public."Exam"')::text AS exams, to_regclass('public."Account"')::text AS accounts`;
      if (!identity[0]?.users || !identity[0]?.exams || !identity[0]?.accounts) throw new Error("Not an Educhi schema");
      const tables = await tx.$queryRaw`
        SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
          r.rolname AS api_role,
          has_table_privilege(r.oid,c.oid,'SELECT') AS can_read,
          has_table_privilege(r.oid,c.oid,'INSERT') AS can_insert,
          has_table_privilege(r.oid,c.oid,'UPDATE') AS can_update,
          has_table_privilege(r.oid,c.oid,'DELETE') AS can_delete
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        CROSS JOIN pg_roles r
        WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m')
          AND r.rolname IN ('anon','authenticated')
        ORDER BY c.relname,r.rolname`;
      const policies = await tx.$queryRaw`
        SELECT tablename,policyname,roles::text AS roles,cmd,
          qual,with_check FROM pg_policies WHERE schemaname='public'
        ORDER BY tablename,policyname`;
      const accounts = await tx.$queryRaw`
        SELECT u.role::text AS role, count(*)::int AS linked_password_accounts,
          count(*) FILTER (WHERE u."emailVerified" IS NULL)::int AS unverified
        FROM "User" u WHERE u."passwordHash" IS NOT NULL
          AND EXISTS (SELECT 1 FROM "Account" a WHERE a."userId"=u.id AND a.provider='google')
        GROUP BY u.role`;
      return { tables, policies, accounts, note: "Linked password accounts are candidates for manual review, not proven compromised." };
    }, { timeout: 20000 });
    console.log(JSON.stringify(report, null, 2));
    if (report.tables.some(t => !t.rls_enabled && (t.can_read || t.can_insert || t.can_update || t.can_delete))) process.exitCode = 2;
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("Read-only audit failed; confirm Educhi database and permissions privately."); process.exitCode = 1; });
