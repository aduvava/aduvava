import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultGradeForExamLevel, gradesForExamLevel, isValidExamGrade } from "../src/lib/exam-grade";

describe("admin exam class selection", () => {
  it("limits THCS and THPT to their own class lists", () => {
    assert.deepEqual(gradesForExamLevel("THCS"), ["Lớp 6", "Lớp 7", "Lớp 8", "Lớp 9"]);
    assert.deepEqual(gradesForExamLevel("THPT"), ["Lớp 10", "Lớp 11", "Lớp 12"]);
    assert.equal(isValidExamGrade("THCS", "Lớp 9"), true);
    assert.equal(isValidExamGrade("THCS", "Lớp 12"), false);
    assert.equal(isValidExamGrade("THPT", "Lớp 6"), false);
  });

  it("has dedicated exam preparation groups and leaves special exams unclassified", () => {
    assert.equal(defaultGradeForExamLevel("EXAM_10"), "Ôn thi vào 10");
    assert.equal(defaultGradeForExamLevel("THPTQG"), "Ôn thi THPTQG");
    assert.equal(isValidExamGrade(null, null, "HSA"), true);
    assert.equal(isValidExamGrade(null, "Lớp 12", "HSA"), false);
  });

  it("keeps existing exams with no grade editable without a destructive reset", () => {
    assert.equal(isValidExamGrade("THCS", null), true);
    assert.equal(isValidExamGrade("THCS", "Lớp 7"), true);
    assert.equal(isValidExamGrade("THPT", "Lớp 10"), true);
    assert.equal(isValidExamGrade("THCS", "Lớp 7", "TSA"), false);
  });
});
