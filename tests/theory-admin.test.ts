import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { gradeToLevel, THEORY_GRADE_OPTIONS, theorySlug, theoryLessonFormSchema, theoryFileIsSupported } from "../src/lib/theory-admin";

describe("admin theory entry", () => {
  it("offers all grades and test-prep levels", () => {
    assert.equal(THEORY_GRADE_OPTIONS.length, 9);
    assert.equal(gradeToLevel("Lớp 6"), "THCS");
    assert.equal(gradeToLevel("Lớp 12"), "THPT");
    assert.equal(gradeToLevel("Ôn thi THPTQG"), "THPTQG");
    assert.equal(gradeToLevel("Ôn thi vào 10"), "EXAM_10");
    assert.equal(gradeToLevel("Lớp 100"), null);
  });
  it("creates stable, safe URL slugs for Vietnamese titles", () => {
    assert.equal(theorySlug("Bài 1: Hàm số"), "bai-1-ham-so");
    assert.equal(theorySlug("../../"), "bai-ly-thuyet");
  });
  it("allows PDF/Word only", () => {
    assert.equal(theoryFileIsSupported("lesson.PDF"), true);
    assert.equal(theoryFileIsSupported("theory.docx"), true);
    assert.equal(theoryFileIsSupported("notes.html"), false);
  });
  it("validates lesson metadata and blocks forged privilege fields", () => {
    const valid = { chapterId:"c1",title:"Bài 1",summary:"",content:"Nội dung",position:"0",accessLevel:"FREE",isPublished:"true",removeFile:"false",lessonId:"" };
    assert.equal(theoryLessonFormSchema.safeParse(valid).success,true);
    assert.equal(theoryLessonFormSchema.safeParse({...valid,accessLevel:"ADMIN"}).success,false);
    assert.equal(theoryLessonFormSchema.safeParse({...valid,userId:"bad"}).success,false);
  });
});
