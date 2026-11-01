import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { registerSchema } from "../src/lib/registration";

const valid = {
  name: "Nguyen Van A",
  email: "Student@Example.com",
  password: "strong-password-123",
};

describe("public registration security", () => {
  it("always defaults to STUDENT when role is not supplied", () => {
    const result = registerSchema.parse(valid);
    assert.equal(result.role, undefined);
    assert.equal(result.email, "student@example.com");
  });

  it("accepts an explicit STUDENT role for backward compatibility", () => {
    assert.equal(registerSchema.parse({ ...valid, role: "STUDENT" }).role, "STUDENT");
  });

  it("rejects self-assigned TEACHER and ADMIN roles", () => {
    for (const role of ["TEACHER", "ADMIN"]) {
      assert.equal(registerSchema.safeParse({ ...valid, role }).success, false);
    }
  });

  it("rejects short passwords and extra privilege-bearing fields", () => {
    assert.equal(registerSchema.safeParse({ ...valid, password: "short" }).success, false);
    assert.equal(registerSchema.safeParse({ ...valid, isAdmin: true }).success, false);
  });

  it("rejects passwords longer than bcrypt's 72 byte limit", () => {
    assert.equal(registerSchema.safeParse({ ...valid, password: "đ".repeat(40) }).success, false);
  });
});
