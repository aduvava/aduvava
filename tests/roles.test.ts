import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveActiveRole } from "../src/lib/roles";

describe("student/teacher mode selection", () => {
  it("never elevates a student via a forged role cookie", () => {
    assert.equal(resolveActiveRole("STUDENT", "TEACHER"), "STUDENT");
    assert.equal(resolveActiveRole("STUDENT", "ADMIN"), "STUDENT");
    assert.equal(resolveActiveRole(null, "ADMIN"), "STUDENT");
  });

  it("allows a teacher to switch freely between teacher and student", () => {
    assert.equal(resolveActiveRole("TEACHER", "STUDENT"), "STUDENT");
    assert.equal(resolveActiveRole("TEACHER", "TEACHER"), "TEACHER");
    assert.equal(resolveActiveRole("TEACHER", "ADMIN"), "TEACHER");
  });

  it("never grants admin unless it is the stored role", () => {
    assert.equal(resolveActiveRole("ADMIN", "ADMIN"), "ADMIN");
    assert.equal(resolveActiveRole("ADMIN", "TEACHER"), "TEACHER");
    assert.equal(resolveActiveRole("ADMIN", "STUDENT"), "STUDENT");
    assert.equal(resolveActiveRole("ADMIN", null), "ADMIN");
  });
});
