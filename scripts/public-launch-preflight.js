#!/usr/bin/env node
"use strict";

// Safe, read-mostly production gate. This is an application preflight, not a
// CDN, TLS certificate, backup-restore, bank-payment or penetration test.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const { documentStorageDirectory } = require("../src/lib/private-document-storage.js");
const { scanDocumentBuffer, scanRequired } = require("../src/lib/document-malware-scan.js");

function validateProductionConfiguration(env, root = process.cwd()) {
  const errors = [];
  const url = (name, value, required) => {
    if (!value) {
      if (required) errors.push(name + " is required");
      return;
    }
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) {
        errors.push(name + " must be a public HTTPS URL without credentials");
      }
    } catch { errors.push(name + " is not a valid URL"); }
  };
  url("NEXTAUTH_URL", env.NEXTAUTH_URL, true);
  url("ADMIN_PUBLIC_ORIGIN", env.ADMIN_PUBLIC_ORIGIN, true);
  if (!env.DATABASE_URL || !/^postgres(ql)?:\/\//.test(env.DATABASE_URL)) {
    errors.push("DATABASE_URL must reference a PostgreSQL database");
  }
  const secret = env.NEXTAUTH_SECRET || "";
  if (secret.length < 32 || /replace|placeholder|build-only|ci-only/i.test(secret)) {
    errors.push("NEXTAUTH_SECRET must contain at least 32 secret non-placeholder characters");
  }
  if (env.SECURITY_RATE_LIMIT_SECRET && env.SECURITY_RATE_LIMIT_SECRET.length < 32) {
    errors.push("SECURITY_RATE_LIMIT_SECRET must contain at least 32 characters if used");
  }
  if (!scanRequired({ ...env, NODE_ENV: "production" })) {
    errors.push("Production malware scanning must not be disabled");
  }
  try { documentStorageDirectory(env, root); }
  catch { errors.push("DOCUMENT_STORAGE_DIR must resolve outside public/"); }
  return errors;
}

// PostgreSQL regclass has an OID that Prisma's raw-query decoder cannot
// deserialize directly. Casting to text keeps the preflight read-only and
// makes the return type safe for Prisma, including when the table is missing.
async function hasSecurityThrottleTable(db) {
  const rows = await db.$queryRaw`SELECT to_regclass('public."SecurityThrottle"')::text AS table_name`;
  return Boolean(rows?.[0]?.table_name);
}

async function runPreflight(env = process.env, deps = {}) {
  const errors = validateProductionConfiguration(env);
  if (errors.length) return { ok: false, errors };
  const db = deps.db || new PrismaClient();
  const ownsDb = !deps.db;
  try {
    try {
      if (!(await hasSecurityThrottleTable(db))) {
        errors.push("SecurityThrottle migration has not been applied");
      }
    } catch {
      errors.push("Unable to verify PostgreSQL connectivity and SecurityThrottle migration");
    }
    try {
      // This probe uses only harmless bytes and does not persist an upload.
      const probe = Buffer.from("%PDF-1.7\n%%EOF\n");
      const result = await scanDocumentBuffer(probe, { ...env, NODE_ENV: "production" });
      if (!result.scanned) errors.push("Malware scanning is not enabled");
    } catch {
      errors.push("ClamAV unavailable or returned no clean verdict");
    }
    try {
      const directory = documentStorageDirectory(env);
      fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
      const filename = ".preflight-" + crypto.randomBytes(16).toString("hex");
      const target = path.join(directory, filename);
      try {
        fs.writeFileSync(target, "storage check", { flag: "wx", mode: 0o600 });
        if (fs.readFileSync(target, "utf8") !== "storage check") {
          errors.push("Private document storage read/write mismatch");
        }
      } finally { fs.rmSync(target, { force: true }); }
    } catch {
      errors.push("Private document storage is not writable");
    }
  } finally {
    if (ownsDb) await db.$disconnect();
  }
  return { ok: errors.length === 0, errors };
}

if (require.main === module) {
  runPreflight().then(result => {
    if (!result.ok) {
      console.error("PUBLIC LAUNCH PREFLIGHT FAILED:");
      result.errors.forEach(error => console.error("- " + error));
      process.exitCode = 1;
      return;
    }
    console.log("Application preflight passed: HTTPS URL configuration, secrets, DB migration,");
    console.log("private storage read/write and live ClamAV scan.");
    console.log("NOT VERIFIED: TLS certificates, CDN permissions, backups/restores, real bank");
    console.log("reconciliation, browser E2E and infrastructure exposure; check manually.");
  }).catch(err => {
    console.error("PUBLIC LAUNCH PREFLIGHT FAILED:", err.message);
    process.exitCode = 1;
  });
}

module.exports = { validateProductionConfiguration, hasSecurityThrottleTable, runPreflight };
