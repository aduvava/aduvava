#!/usr/bin/env node
"use strict";

// Read-only deployment safety gate: prevent newly built containers from
// serving pages before PostgreSQL has the Exam columns required by Prisma.
// Intended to run AFTER "prisma migrate deploy" and BEFORE container swap.
const { PrismaClient } = require("@prisma/client");

const REQUIRED_COLUMNS = ["grade", "contentMode"];

async function missingExamColumns(db) {
  const rows = await db.$queryRaw`SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Exam'
      AND column_name IN ('grade', 'contentMode')`;
  const found = new Set(rows.map((row) => row.column_name));
  return REQUIRED_COLUMNS.filter((name) => !found.has(name));
}

async function verifyExamSchema(db) {
  const missing = await missingExamColumns(db);
  if (missing.length) {
    throw new Error(
      `Exam database schema is outdated. Missing: ${missing.join(", ")}. ` +
      "Apply pending migrations: npx prisma migrate deploy"
    );
  }
  // A legacy TEXT column may exist yet still be incompatible with Prisma's enum.
  const modeType = await db.$queryRaw`SELECT udt_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Exam' AND column_name = 'contentMode'`;
  if (modeType?.[0]?.udt_name !== "ExamContentMode") {
    throw new Error("Exam.contentMode must use PostgreSQL enum ExamContentMode; legacy text values need conversion.");
  }
  // Validate that generated Prisma client can query the actual enum values.
  await db.exam.findFirst({ select: { id: true, grade: true, contentMode: true } });
}

if (require.main === module) {
  const db = new PrismaClient();
  verifyExamSchema(db)
    .then(() => console.log("Exam schema OK: grade and contentMode are available."))
    .catch((error) => {
      console.error("EXAM SCHEMA CHECK FAILED:", error.message);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}

module.exports = { missingExamColumns, verifyExamSchema };
