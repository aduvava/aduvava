import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getNationalExamRule, getNationalQuestionCount } from "@/lib/national-exam-rules";
import { scoreQuestion } from "@/lib/scoring";

describe("national exam rules", () => {
  it("locks Math to 90 minutes and 12/4/6 questions", () => {
    const rule = getNationalExamRule("toan");
    assert.equal(rule?.durationMinutes, 90);
    assert.deepEqual(rule?.parts.map((part) => part.count), [12, 4, 6]);
    assert.equal(rule && getNationalQuestionCount(rule), 22);
  });

  it("uses the 18/4/6 science structure", () => {
    const rule = getNationalExamRule("vat-ly");
    assert.equal(rule?.durationMinutes, 50);
    assert.deepEqual(rule?.parts.map((part) => part.count), [18, 4, 6]);
    assert.equal(rule && getNationalQuestionCount(rule), 28);
  });

  it("scores four-statement true/false questions with the national partial scale", () => {
    const question = {
      id: "tf",
      type: "TRUE_FALSE_SET" as const,
      points: 1,
      answerOptions: [
        { id: "a", isCorrect: true },
        { id: "b", isCorrect: false },
        { id: "c", isCorrect: true },
        { id: "d", isCorrect: false },
      ],
    };

    assert.equal(scoreQuestion(question, { a: true }).score, 0.1);
    assert.equal(scoreQuestion(question, { a: true, b: false }).score, 0.25);
    assert.equal(scoreQuestion(question, { a: true, b: false, c: true }).score, 0.5);
    assert.equal(scoreQuestion(question, { a: true, b: false, c: true, d: false }).score, 1);
  });
});
