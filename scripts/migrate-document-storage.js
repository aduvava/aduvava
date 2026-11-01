#!/usr/bin/env node
"use strict";

// One-time, repeatable migration of existing user-uploaded documents from
// public/uploads/documents to private storage. NO DATABASE WRITES.
// Back up both the DB and upload volume before using --remove-legacy.
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const {
  documentStorageDirectory, documentStoredPath, STORED_NAME,
} = require("../src/lib/private-document-storage.js");

function digest(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function parseArgs(args) {
  const flags = new Set(args);
  for (const flag of flags) {
    if (!["--remove-legacy", "--dry-run"].includes(flag)) throw new Error("Unknown flag: " + flag);
  }
  if (flags.has("--remove-legacy") && flags.has("--dry-run")) {
    throw new Error("Use --remove-legacy or --dry-run, not both");
  }
  return { removeLegacy: flags.has("--remove-legacy"), dryRun: flags.has("--dry-run") };
}

async function migrate({ db, root = process.cwd(), env = process.env, removeLegacy = false, dryRun = false }) {
  const oldRoot = path.join(root, "public", "uploads", "documents");
  const privateRoot = documentStorageDirectory(env, root);
  if (path.resolve(oldRoot) === path.resolve(privateRoot)) throw new Error("Storage folders overlap");
  const rows = await db.document.findMany({ select: { id: true, storedName: true } });
  let copied = 0, alreadyCopied = 0, missing = 0, removed = 0;
  if (!dryRun) fs.mkdirSync(privateRoot, { recursive: true, mode: 0o700 });
  for (const row of rows) {
    if (!STORED_NAME.test(row.storedName)) throw new Error("Unsafe storedName for " + row.id);
    const src = path.join(oldRoot, row.storedName);
    const dst = documentStoredPath(row.storedName, env, root);
    if (!fs.existsSync(src)) {
      if (!fs.existsSync(dst)) missing++;
      else alreadyCopied++;
      continue;
    }
    const stat = fs.lstatSync(src);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > 15 * 1024 * 1024) {
      throw new Error("Unsafe legacy file: " + row.storedName);
    }
    if (fs.existsSync(dst)) {
      const privateStat = fs.lstatSync(dst);
      if (!privateStat.isFile() || privateStat.isSymbolicLink() ||
          privateStat.size !== stat.size || digest(src) !== digest(dst)) {
        throw new Error("Private copy differs: " + row.storedName);
      }
      alreadyCopied++;
    } else if (!dryRun) {
      fs.copyFileSync(src, dst, fs.constants.COPYFILE_EXCL);
      fs.chmodSync(dst, 0o600);
      if (digest(src) !== digest(dst)) throw new Error("Checksum mismatch: " + row.storedName);
      copied++;
    } else copied++;

    if (removeLegacy) {
      // Only remove legacy public copy after verifying the private copy.
      if (!fs.existsSync(dst) || digest(src) !== digest(dst)) {
        throw new Error("Private copy not verified: " + row.storedName);
      }
      fs.unlinkSync(src);
      removed++;
    }
  }
  return { total: rows.length, copied, alreadyCopied, missing, removed, privateRoot };
}

if (require.main === module) {
  const db = new PrismaClient();
  Promise.resolve().then(async () => {
    const summary = await migrate({ db, ...parseArgs(process.argv.slice(2)) });
    console.log("Private document migration:", JSON.stringify(summary));
    if (summary.missing) {
      process.exitCode = 2;
      console.error("Some database rows have missing files: restore them from a backup.");
    }
  }).catch((error) => {
    console.error("Migration aborted:", error.message);
    process.exitCode = 1;
  }).finally(() => db.$disconnect());
}

module.exports = { migrate, parseArgs };
