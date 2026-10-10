import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoreQuestion, scoreExam } from "@/lib/scoring";

describe("scoring", () => {
  it("scores single choice questions", () => {
    const result = scoreQuestion({ id: "q1", type: "SINGLE_CHOICE", points: 1, answerOptions: [{ id: "a", isCorrect: false }, { id: "b", isCorrect: true }] }, "b");
    assert.equal(result.score, 1);
    assert.equal(result.isCorrect, true);
  });

  it("scores true false sets with partial credit", () => {
    const result = scoreQuestion({ id: "q1", type: "TRUE_FALSE_SET", points: 2, answerOptions: [{ id: "a", isCorrect: true }, { id: "b", isCorrect: false }] }, { a: true, b: true });
    assert.equal(result.score, 1);
    assert.equal(result.isCorrect, false);
  });

  it("normalizes short answers", () => {
    const result = scoreQuestion({ id: "q1", type: "SHORT_ANSWER", points: 1, correctText: "Điện Biên Phủ", answerOptions: [] }, "dien bien phu");
    assert.equal(result.score, 1);
  });

  it("aggregates exam score", () => {
    const result = scoreExam([
      { id: "q1", type: "SINGLE_CHOICE", points: 1, answerOptions: [{ id: "a", isCorrect: true }] },
      { id: "q2", type: "ESSAY", points: 2, answerOptions: [] }
    ], [{ questionId: "q1", value: "a" }]);
    assert.equal(result.score, 1);
    assert.equal(result.maxScore, 3);
  });
});
