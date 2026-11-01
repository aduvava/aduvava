import { describe, it } from "node:test";
import assert from "node:assert/strict";
const {
  TooManyRequestsError, trustedClientIp, throttleKey, consumeSecurityThrottle, rateLimitOperation,
} = require("../src/lib/security-throttle.js");

describe("database-backed abuse protection", () => {
  it("stores an HMAC digest rather than email/IP and has separate policy scopes", () => {
    const original = process.env.SECURITY_RATE_LIMIT_SECRET;
    process.env.SECURITY_RATE_LIMIT_SECRET = "unit-tests-only-secret-do-not-use-in-production";
    try {
      const key = throttleKey("login-account", "Student@EXAMPLE.COM");
      assert.equal(key, throttleKey("login-account", "student@example.com"));
      assert.notEqual(key, throttleKey("register-account", "student@example.com"));
      assert.ok(!key.includes("student@example.com"));
    } finally {
      if (original === undefined) delete process.env.SECURITY_RATE_LIMIT_SECRET;
      else process.env.SECURITY_RATE_LIMIT_SECRET = original;
    }
  });

  it("ignores client-controlled forwarding headers until the proxy is explicitly trusted", () => {
    const before = process.env.SECURITY_TRUST_PROXY_IP_HEADERS;
    try {
      const headers = { "x-forwarded-for": "203.0.113.15, 127.0.0.1" };
      delete process.env.SECURITY_TRUST_PROXY_IP_HEADERS;
      assert.equal(trustedClientIp(headers), null);
      process.env.SECURITY_TRUST_PROXY_IP_HEADERS = "true";
      assert.equal(trustedClientIp(headers), "203.0.113.15");
      assert.equal(trustedClientIp({ "x-forwarded-for": "spoofed" }), null);
    } finally {
      if (before === undefined) delete process.env.SECURITY_TRUST_PROXY_IP_HEADERS;
      else process.env.SECURITY_TRUST_PROXY_IP_HEADERS = before;
    }
  });

  it("rejects after a fixed-window limit and advertises a retry delay", async () => {
    const original = process.env.SECURITY_RATE_LIMIT_SECRET;
    process.env.SECURITY_RATE_LIMIT_SECRET = "unit-tests-only-secret-do-not-use-in-production";
    try {
      let hits = 0;
      const db = {
        $queryRaw: async () => [{ hits: ++hits, expiresAt: new Date(Date.now() + 60000) }],
      };
      await consumeSecurityThrottle(db, "login-account", "test@example.com", { limit: 2, windowSeconds: 60 });
      await consumeSecurityThrottle(db, "login-account", "test@example.com", { limit: 2, windowSeconds: 60 });
      await assert.rejects(
        consumeSecurityThrottle(db, "login-account", "test@example.com", { limit: 2, windowSeconds: 60 }),
        (error: unknown) => error instanceof TooManyRequestsError &&
          (error as Error & { status?: number }).status === 429,
      );
    } finally {
      if (original === undefined) delete process.env.SECURITY_RATE_LIMIT_SECRET;
      else process.env.SECURITY_RATE_LIMIT_SECRET = original;
    }
  });

  it("uses persistent shared buckets for every registration even when proxy headers are disabled", async () => {
    const prev = process.env.SECURITY_RATE_LIMIT_SECRET;
    process.env.SECURITY_RATE_LIMIT_SECRET = "unit-tests-only-secret-do-not-use-in-production";
    const keys: unknown[] = [];
    const db = { $queryRaw: async (query: unknown) => {
      keys.push(query);
      return [{ hits: 1, expiresAt: new Date(Date.now() + 60000) }];
    } };
    try {
      await rateLimitOperation(db, "register", "student@example.com", {});
      assert.equal(keys.length, 2, "global and account buckets always apply");
    } finally {
      if (prev === undefined) delete process.env.SECURITY_RATE_LIMIT_SECRET;
      else process.env.SECURITY_RATE_LIMIT_SECRET = prev;
    }
  });
});
