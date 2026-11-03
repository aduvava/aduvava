import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { studentSecurityHeaders } from "../src/lib/security-headers";

describe("HTTP security headers", () => {
  it("blocks framing and MIME sniffing", () => {
    const headers = new Map(studentSecurityHeaders(true).map((header) => [header.key, header.value]));
    assert.equal(headers.get("X-Frame-Options"), "DENY");
    assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(headers.get("Referrer-Policy"), "no-referrer");
    assert.equal(headers.get("Strict-Transport-Security"), "max-age=31536000");
  });
  it("blocks arbitrary image hosts, objects and embedded origins", () => {
    const csp = studentSecurityHeaders(true).find((header) => header.key === "Content-Security-Policy")!.value;
    assert.ok(csp.includes("object-src 'none'"));
    assert.ok(csp.includes("frame-ancestors 'none'"));
    assert.ok(csp.includes("img-src 'self'"));
    assert.equal(csp.includes("img-src *"), false);
    assert.equal(csp.includes("unsafe-eval"), false);
  });
  it("does not force HTTPS on development localhost", () => {
    const headers = studentSecurityHeaders(false);
    assert.equal(headers.some((header) => header.key === "Strict-Transport-Security"), false);
    assert.equal(headers.some((header) => header.key === "Content-Security-Policy"), false);
  });
});
