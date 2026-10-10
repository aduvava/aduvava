import { describe, expect, it } from "vitest";
import { scoreQuestion, scoreExam } from "@/lib/scoring";

describe("scoring", () => {
  it("scores single choice questions", () => {
    const result = scoreQuestion({ id: "q1", type: "SINGLE_CHOICE", points: 1, answerOptions: [{ id: "a", isCorrect: false }, { id: "b", isCorrect: true }] }, "b");
    expect(result.score).toBe(1);
    expect(result.isCorrect).toBe(true);
  });

  it("scores true false sets with partial credit", () => {
    const result = scoreQuestion({ id: "q1", type: "TRUE_FALSE_SET", points: 2, answerOptions: [{ id: "a", isCorrect: true }, { id: "b", isCorrect: false }] }, { a: true, b: true });
    expect(result.score).toBe(1);
    expect(result.isCorrect).toBe(false);
  });

  it("normalizes short answers", () => {
    const result = scoreQuestion({ id: "q1", type: "SHORT_ANSWER", points: 1, correctText: "Điện Biên Phủ", answerOptions: [] }, "dien bien phu");
    expect(result.score).toBe(1);
  });

  it("aggregates exam score", () => {
    const result = scoreExam([
      { id: "q1", type: "SINGLE_CHOICE", points: 1, answerOptions: [{ id: "a", isCorrect: true }] },
      { id: "q2", type: "ESSAY", points: 2, answerOptions: [] }
    ], [{ questionId: "q1", value: "a" }]);
    expect(result.score).toBe(1);
    expect(result.maxScore).toBe(3);
  });
});
