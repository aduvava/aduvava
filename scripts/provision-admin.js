#!/usr/bin/env node
"use strict";

// Run only from a trusted administrator shell on the application host.
// This tool never grants roles during website sign-in and never stores secrets in source.
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

function normalizeEmail(input) {
  const email = String(input || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error("Provide a valid email address.");
  }
  return email;
}

async function readPassword() {
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > 4096) throw new Error("Password input is too large.");
    chunks.push(chunk);
  }
  // Allow a single trailing newline from a terminal pipe, never trim spaces.
  const password = Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  if (password.length < 16) {
    console.warn("Warning: this admin password is short. Change it to 16+ unique characters.");
  }
  return password;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1 || args.length > 2 || (args[1] && args[1] !== "--password-stdin")) {
    throw new Error("Usage: node scripts/provision-admin.js EMAIL [--password-stdin]");
  }
  const email = normalizeEmail(args[0]);
  const setPassword = args[1] === "--password-stdin";
  // Read the password from a pipe instead of command-line arguments, environment
  // variables, .env, shell history, or the Git repository.
  const passwordHash = setPassword ? await bcrypt.hash(await readPassword(), 12) : undefined;
  const prisma = new PrismaClient();
  try {
    // PostgreSQL email uniqueness is case-sensitive; preserve the existing user
    // (and all linked Google accounts, profile, exams and purchases) if present.
    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true },
    });
    if (!existing && !passwordHash) {
      throw new Error("No account with that email exists. Pipe a password using --password-stdin to create it.");
    }
    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { role: "ADMIN", ...(passwordHash ? { passwordHash } : {}) },
          select: { email: true, role: true },
        })
      : await prisma.user.create({
          data: { email, name: "Admin", role: "ADMIN", passwordHash },
          select: { email: true, role: true },
        });
    console.log(`Account ready: ${user.email} / ${user.role}. Existing data was preserved.`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Admin provisioning failed:", error.message);
    process.exitCode = 1;
  });
}

module.exports = { normalizeEmail };
