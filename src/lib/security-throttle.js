"use strict";

const { createHmac } = require("node:crypto");
const { isIP } = require("node:net");
const { Prisma } = require("@prisma/client");

class TooManyRequestsError extends Error {
  constructor(retryAfterSeconds) {
    super("Too many requests. Please try again later.");
    this.name = "TooManyRequestsError";
    this.status = 429;
    this.retryAfterSeconds = Math.max(1, Math.ceil(retryAfterSeconds));
  }
}

function readHeader(headers, name) {
  if (!headers) return "";
  if (typeof headers.get === "function") return headers.get(name) || "";
  const raw = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
  return Array.isArray(raw) ? raw[0] || "" : typeof raw === "string" ? raw : "";
}

// Trust forwarding headers ONLY when an administrator explicitly confirms that
// the reverse proxy strips incoming client-supplied X-Forwarded-For headers.
// The fallback remoteAddress can be a shared proxy IP, so never use it alone
// for tight per-client quotas. Account limits still apply without this setting.
function trustedClientIp(headers) {
  if (process.env.SECURITY_TRUST_PROXY_IP_HEADERS !== "true") return null;
  const forwarded = readHeader(headers, "x-forwarded-for").split(",")[0].trim();
  const real = readHeader(headers, "x-real-ip").trim();
  const candidate = forwarded || real;
  return isIP(candidate) ? candidate.toLowerCase() : null;
}

function throttleKey(scope, subject) {
  if (!/^[a-z0-9-]{1,35}$/.test(scope)) throw new Error("Invalid throttle scope");
  const secret = process.env.SECURITY_RATE_LIMIT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SECURITY_RATE_LIMIT_SECRET or NEXTAUTH_SECRET must be configured");
  }
  return scope + ":" + createHmac("sha256", secret)
    .update(String(subject).trim().toLowerCase()).digest("hex");
}

async function consumeSecurityThrottle(db, scope, subject, { limit, windowSeconds }) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100000 ||
      !Number.isSafeInteger(windowSeconds) || windowSeconds < 1 || windowSeconds > 604800) {
    throw new Error("Invalid throttle policy");
  }
  const key = throttleKey(scope, subject);
  // One SQL UPSERT guarantees correctness under concurrent requests and
  // across multiple Next.js instances; never read then increment in JS.
  const rows = await db.$queryRaw(Prisma.sql`
    INSERT INTO "SecurityThrottle" ("key", "hits", "expiresAt", "updatedAt")
    VALUES (${key}, 1, NOW() + (${windowSeconds} * INTERVAL '1 second'), NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "hits" = CASE WHEN "SecurityThrottle"."expiresAt" <= NOW()
        THEN 1 ELSE "SecurityThrottle"."hits" + 1 END,
      "expiresAt" = CASE WHEN "SecurityThrottle"."expiresAt" <= NOW()
        THEN NOW() + (${windowSeconds} * INTERVAL '1 second')
        ELSE "SecurityThrottle"."expiresAt" END,
      "updatedAt" = NOW()
    RETURNING "hits", "expiresAt"
  `);
  const row = rows[0];
  if (!row) throw new Error("Throttle database unavailable");
  if (row.hits > limit) {
    throw new TooManyRequestsError((new Date(row.expiresAt).getTime() - Date.now()) / 1000);
  }
  return { remaining: limit - row.hits, expiresAt: row.expiresAt };
}

async function rateLimitOperation(db, operation, subject, headers) {
  const ip = trustedClientIp(headers);
  const policies = {
    login: { account: [15, 900], ip: [100, 900] },
    "admin-login": { account: [8, 900], ip: [60, 900] },
    register: { account: [5, 3600], ip: [25, 3600], global: [2000, 3600] },
    "exam-password": { account: [12, 900], ip: [100, 900] },
    contact: { account: [4, 3600], ip: [15, 3600], global: [1200, 3600] },
    upload: { account: [15, 3600], ip: [50, 3600] },
  };
  const policy = policies[operation];
  if (!policy) throw new Error("Unknown operation");
  if (policy.global) {
    await consumeSecurityThrottle(db, operation + "-global", "all", {
      limit: policy.global[0], windowSeconds: policy.global[1],
    });
  }
  if (ip && policy.ip) {
    await consumeSecurityThrottle(db, operation + "-ip", ip, {
      limit: policy.ip[0], windowSeconds: policy.ip[1],
    });
  }
  if (subject && policy.account) {
    await consumeSecurityThrottle(db, operation + "-account", subject, {
      limit: policy.account[0], windowSeconds: policy.account[1],
    });
  }
}

module.exports = {
  TooManyRequestsError, readHeader, trustedClientIp,
  throttleKey, consumeSecurityThrottle, rateLimitOperation,
};
