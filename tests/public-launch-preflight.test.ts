import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
const { validateProductionConfiguration } = require("../scripts/public-launch-preflight.js");

const valid = {
  NEXTAUTH_URL: "https://eduva.example.com",
  ADMIN_PUBLIC_ORIGIN: "https://admin.eduva.example.com",
  DATABASE_URL: "postgresql://user:password@database.example.com:5432/eduva",
  NEXTAUTH_SECRET: "unit-tests-only-random-long-secret-123456789",
  SECURITY_RATE_LIMIT_SECRET: "other-long-random-secret-123456789000",
  DOCUMENT_SCAN_REQUIRED: "true",
};

describe("production launch preflight", () => {
  it("accepts a plausible secure setup without connecting to production", () => {
    assert.deepEqual(validateProductionConfiguration(valid, "/var/www/eduva"), []);
  });
  it("fails when HTTPS, key material, DB or malware scan are missing", () => {
    const errors = validateProductionConfiguration({
      ...valid,
      NEXTAUTH_URL: "http://localhost:3000",
      ADMIN_PUBLIC_ORIGIN: "",
      NEXTAUTH_SECRET: "replace-with-a-long-random-secret",
      DATABASE_URL: "sqlite:./tmp.db",
      DOCUMENT_SCAN_REQUIRED: "false",
    }, "/var/www/eduva");
    assert.ok(errors.some((e: string) => e.includes("NEXTAUTH_URL")));
    assert.ok(errors.some((e: string) => e.includes("ADMIN_PUBLIC_ORIGIN")));
    assert.ok(errors.some((e: string) => e.includes("NEXTAUTH_SECRET")));
    assert.ok(errors.some((e: string) => e.includes("DATABASE_URL")));
    assert.ok(errors.some((e: string) => e.includes("malware")));
  });
  it("refuses an upload path located inside public/", () => {
    const errors = validateProductionConfiguration({
      ...valid,
      DOCUMENT_STORAGE_DIR: join("/var/www/eduva", "public", "uploads", "documents"),
    }, "/var/www/eduva");
    assert.ok(errors.some((e: string) => e.includes("DOCUMENT_STORAGE_DIR")));
  });
});
