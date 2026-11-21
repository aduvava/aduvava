import assert from "node:assert/strict";
import { test } from "node:test";
import { assessmentQuestionCount, flattenAssessmentBlocks, getAssessmentRule } from "../src/lib/special-exam-rules";
import { validateOfficialSpecialExam } from "../src/lib/official-special-exam-publication";

function validQuestions(track: string, variantId: string) {
  const rule = getAssessmentRule(track);
  assert.ok(rule);
  const variant = rule.variants.find((entry) => entry.id === variantId);
  assert.ok(variant);
  return flattenAssessmentBlocks(variant).flatMap((block) =>
    Array.from({ length: block.count }, (_, index) => {
      const type = block.requiredShortAnswers && index >= block.count - block.requiredShortAnswers
        ? "SHORT_ANSWER" : block.questionType;
      return {
        position: block.start + index,
        type,
        points: block.pointsPerQuestion,
        prompt: "Câu luyện tập " + (block.start + index),
        correctText: type === "SHORT_ANSWER" ? "42" : null,
        answerOptions: type === "SINGLE_CHOICE"
          ? [true, false, false, false].map((isCorrect) => ({ isCorrect }))
          : type === "TRUE_FALSE_SET"
            ? [true, false, true, false].map((isCorrect) => ({ isCorrect }))
            : [],
      };
    }),
  );
}

test("native Admin publication validation supports all 22 DGNL variants", () => {
  for (const track of ["HSA", "TSA", "V_ACT", "QDA", "DGNL_BCA"]) {
    const rule = getAssessmentRule(track);
    assert.ok(rule);
    for (const variant of rule.variants) {
      const questions = validQuestions(track, variant.id);
      assert.equal(questions.length, assessmentQuestionCount(variant));
      const result = validateOfficialSpecialExam({
        track, variantId: variant.id, durationMinutes: rule.durationMinutes, questions,
      });
      assert.equal(result.variantId, variant.id);
      assert.equal(result.scoreMode, rule.scoreMode);
    }
  }
});

test("native Admin rejects an incorrect weight, a missing BCA essay and unselected variant", () => {
  const questions = validQuestions("DGNL_BCA", "CA1");
  assert.throws(() => validateOfficialSpecialExam({
    track: "DGNL_BCA", variantId: "", durationMinutes: 180, questions,
  }), /tổ hợp/);
  assert.throws(() => validateOfficialSpecialExam({
    track: "DGNL_BCA", variantId: "CA1", durationMinutes: 180, questions: questions.slice(1),
  }), /81 câu/);
  assert.throws(() => validateOfficialSpecialExam({
    track: "DGNL_BCA", variantId: "CA1", durationMinutes: 180,
    questions: questions.map((question, index) => index === 0 ? { ...question, points: 1 } : question),
  }), /25 điểm/);
});

test("native Admin refuses extra uncalibrated QDA numeric answers", () => {
  const questions = validQuestions("QDA", "LY_HOA");
  const block = flattenAssessmentBlocks(getAssessmentRule("QDA")!.variants.find((item) => item.id === "LY_HOA")!)
    .find((entry) => entry.key === "SELECT_0");
  assert.ok(block);
  const changed = questions.map((question) => question.position === block.start
    ? { ...question, type: "SHORT_ANSWER" as const, answerOptions: [], correctText: "9" } : question);
  assert.throws(() => validateOfficialSpecialExam({
    track: "QDA", variantId: "LY_HOA", durationMinutes: 195, questions: changed,
  }), /1 câu điền đáp án/);
});
