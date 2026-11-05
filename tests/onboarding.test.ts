import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { completeStudentProfileSchema, completeTeacherProfileSchema, isStudentOnboardingComplete, isTeacherOnboardingComplete, safePostLoginPath } from "../src/lib/onboarding";

describe("Google and email onboarding", () => {
  it("requires grade, school and province before entering the student dashboard", () => {
    assert.equal(isStudentOnboardingComplete(null), false);
    assert.equal(isStudentOnboardingComplete({ grade: "10", school: " ", province: "Hà Nội" }), false);
    assert.equal(isStudentOnboardingComplete({ grade: "10", school: "THPT A", province: "Hà Nội" }), true);
  });

  it("validates completed onboarding server-side and does not require an aspiration", () => {
    const valid = { grade: "10", school: "THPT Nguyễn Trãi", province: "Hà Nội", source: "onboarding" };
    assert.equal(completeStudentProfileSchema.safeParse(valid).success, true);
    for (const key of ["grade", "school", "province"] as const) {
      assert.equal(completeStudentProfileSchema.safeParse({ ...valid, [key]: "" }).success, false);
    }
    assert.equal(completeStudentProfileSchema.safeParse({ ...valid, grade: "99" }).success, false);
    assert.equal(completeStudentProfileSchema.safeParse({ ...valid, source: "avatar-menu" }).success, false);
    assert.equal(completeStudentProfileSchema.safeParse({ ...valid, role: "ADMIN" }).success, false);
  });

  it("requires teacher school and province, but not a student grade", () => {
    assert.equal(isTeacherOnboardingComplete(null), false);
    assert.equal(isTeacherOnboardingComplete({ school: "THPT A", province: "Hà Nội" }), true);
    assert.equal(isTeacherOnboardingComplete({ school: "  ", province: "Hà Nội" }), false);
    assert.equal(completeTeacherProfileSchema.safeParse({ school: "THPT A", province: "Hà Nội", source: "onboarding" }).success, true);
    assert.equal(completeTeacherProfileSchema.safeParse({ school: "THPT A", province: "Hà Nội", source: "onboarding", role: "ADMIN" }).success, false);
  });

  it("keeps OAuth callback destinations on this site and prevents redirect loops", () => {
    assert.equal(safePostLoginPath("/exams?grade=10"), "/exams?grade=10");
    assert.equal(safePostLoginPath("https://evil.test"), "/dashboard");
    assert.equal(safePostLoginPath("//evil.test"), "/dashboard");
    assert.equal(safePostLoginPath("/\\evil.test"), "/dashboard");
    assert.equal(safePostLoginPath("/auth/continue?callbackUrl=/dashboard"), "/dashboard");
    assert.equal(safePostLoginPath("/auth/select-role?role=admin"), "/dashboard");
    assert.equal(safePostLoginPath("/login"), "/dashboard");
    assert.equal(safePostLoginPath("/api/auth/session"), "/dashboard");
  });
});
