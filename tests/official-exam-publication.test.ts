import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateOfficialNationalExam, type OfficialExamQuestion } from "../src/lib/official-exam-publication";

function mathTemplate(): OfficialExamQuestion[] {
  return Array.from({ length: 22 }, (_, index) => {
    const isChoice = index < 12;
    const isTrueFalse = index >= 12 && index < 16;
    return {
      position: index + 1,
      type: isChoice ? "SINGLE_CHOICE" : isTrueFalse ? "TRUE_FALSE_SET" : "SHORT_ANSWER",
      points: isChoice ? 0.25 : isTrueFalse ? 1 : 0.5,
      prompt: `Câu hỏi số ${index + 1}`,
      correctText: isChoice || isTrueFalse ? null : "42",
      answerOptions: isChoice
        ? [{ isCorrect: true }, { isCorrect: false }]
        : isTrueFalse ? Array.from({ length: 4 }, (_, i) => ({ isCorrect: i === 0 }))
        : [],
    };
  });
}

const sample = {
  educationLevel: "THPTQG",
  subjectSlug: "toan",
  durationMinutes: 90,
  questions: mathTemplate(),
};

describe("official THPTQG admin publishing", () => {
  it("accepts a valid 12/4/6 math paper", () => {
    assert.equal(validateOfficialNationalExam(sample)?.durationMinutes, 90);
  });

  it("requires the exact national structure only for official papers", () => {
    assert.throws(() => validateOfficialNationalExam({ ...sample, questions: sample.questions.slice(0, 10) }), /22 câu/);
    assert.throws(() => validateOfficialNationalExam({ ...sample, durationMinutes: 45 }), /90 phút/);
    const wrongType = mathTemplate();
    wrongType[12].type = "SINGLE_CHOICE";
    assert.throws(() => validateOfficialNationalExam({ ...sample, questions: wrongType }), /TRUE_FALSE_SET/);
    const wrongAnswer = mathTemplate();
    wrongAnswer[16].correctText = "";
    assert.throws(() => validateOfficialNationalExam({ ...sample, questions: wrongAnswer }), /đáp án/);
  });

  it("never constrains non-national admin exams", () => {
    assert.equal(validateOfficialNationalExam({
      educationLevel: "THCS", subjectSlug: "toan", durationMinutes: 10, questions: [],
    }), null);
    assert.equal(validateOfficialNationalExam({
      educationLevel: "THPT", subjectSlug: "toan", durationMinutes: 15,
      questions: [{ position: 1, type: "ESSAY", points: 10, prompt: "Tự luận", answerOptions: [] }],
    }), null);
  });
});
