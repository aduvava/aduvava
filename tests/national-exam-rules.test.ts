import { describe, expect, it } from "vitest";
import { getNationalExamRule, getNationalQuestionCount } from "@/lib/national-exam-rules";
import { scoreQuestion } from "@/lib/scoring";

describe("national exam rules", () => {
  it("locks Math to 90 minutes and 12/4/6 questions", () => {
    const rule = getNationalExamRule("toan");
    expect(rule?.durationMinutes).toBe(90);
    expect(rule?.parts.map((part) => part.count)).toEqual([12, 4, 6]);
    expect(rule && getNationalQuestionCount(rule)).toBe(22);
  });

  it("uses the 18/4/6 science structure", () => {
    const rule = getNationalExamRule("vat-ly");
    expect(rule?.durationMinutes).toBe(50);
    expect(rule?.parts.map((part) => part.count)).toEqual([18, 4, 6]);
    expect(rule && getNationalQuestionCount(rule)).toBe(28);
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

    expect(scoreQuestion(question, { a: true }).score).toBe(0.1);
    expect(scoreQuestion(question, { a: true, b: false }).score).toBe(0.25);
    expect(scoreQuestion(question, { a: true, b: false, c: true }).score).toBe(0.5);
    expect(scoreQuestion(question, { a: true, b: false, c: true, d: false }).score).toBe(1);
  });
});
