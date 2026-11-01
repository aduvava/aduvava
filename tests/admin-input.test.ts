import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseAdminInput } from "../src/lib/admin-input";

describe("admin payload allowlists", () => {
  it("rejects privilege and balance mass assignment on users", () => {
    for (const malicious of [
      { role: "ADMIN", passwordHash: "attacker" },
      { name: "Example", coins: 1000000 },
      { password: "password-change-without-hashing" },
    ]) {
      assert.throws(() => parseAdminInput("users", malicious, "update"));
    }
  });

  it("allows only valid role edits for existing users", () => {
    assert.deepEqual(parseAdminInput("users", { role: "TEACHER" }, "update"), { role: "TEACHER" });
  });

  it("does not let a nested Prisma relation override a payment", () => {
    assert.throws(() => parseAdminInput("payments", {
      status: "PAID", user: { connect: { id: "other" } },
    }, "update"));
  });

  it("rejects IDs and timestamp overrides on resources", () => {
    assert.throws(() => parseAdminInput("subjects", { id: "fixed", name: "Math" }, "update"));
    assert.throws(() => parseAdminInput("blogs", { createdAt: "2020-01-01T00:00:00Z" }, "create"));
  });

  it("accepts valid item edits without nested Prisma writes", () => {
    assert.deepEqual(parseAdminInput("plans", { price: 99000, isActive: true }, "update"), {
      price: 99000, isActive: true,
    });
  });

  it("rejects unexpected question fields inside answer options", () => {
    assert.throws(() => parseAdminInput("questions", {
      answerOptions: [{ label: "A", content: "One", isCorrect: true, questionId: "foreign" }],
    }, "update"));
  });

  it("requires a real password for new administrator-created users", () => {
    assert.throws(() => parseAdminInput("users", {
      email: "example@example.com", role: "STUDENT", password: "short",
    }, "create"));
  });

  it("rejects empty or unknown update inputs", () => {
    assert.throws(() => parseAdminInput("questions", {}, "update"));
    assert.throws(() => parseAdminInput("unknown", {}, "update"));
  });
});
