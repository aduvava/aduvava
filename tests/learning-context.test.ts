import { it } from "node:test";
import assert from "node:assert/strict";
import { chapterMatches, learningContext } from "../src/lib/learning-context";
import { validateOfficialNationalExam } from "../src/lib/official-exam-publication";
it("chapters are scoped to the selected subject, school level and grade", () => {
 const chapter = { subjectId: "math", educationLevel: "THCS", grade: "Lớp 8" };
 assert.equal(chapterMatches(chapter, "math", "Lớp 8"), true);
 assert.equal(chapterMatches(chapter, "english", "Lớp 8"), false);
 assert.equal(chapterMatches(chapter, "math", "Lớp 9"), false);
 assert.equal(chapterMatches({ ...chapter, grade: null }, "math", "Lớp 8"), true);
 assert.deepEqual(learningContext("Ôn thi vào 10"), { educationLevel: "EXAM_10", grade: "Môn thi" });
 assert.equal(chapterMatches({ subjectId: "math", ...learningContext("Ôn thi vào 10") }, "math", "Ôn thi THPTQG"), false);
});
it("national-exam topic practice can use its own duration and question count", () => {
 assert.equal(validateOfficialNationalExam({ educationLevel: "THPTQG", contentMode: "topics", subjectSlug: "toan", durationMinutes: 15, questions: [] }), null);
 assert.throws(() => validateOfficialNationalExam({ educationLevel: "THPTQG", contentMode: "exams", subjectSlug: "toan", durationMinutes: 15, questions: [] }), /90 phút/);
});
