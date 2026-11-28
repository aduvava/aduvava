import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateExamExp, isRankedExam } from "../src/lib/exp-system";

describe("ranked EXP eligibility", () => {
  it("allows only published system exams", () => {
    assert.equal(isRankedExam({ ownerId: null, code: "SYSTEM-1", isPublished: true }), true);
    assert.equal(isRankedExam({ ownerId: "student", code: "USER-1", isPublished: true }), false);
    assert.equal(isRankedExam({ ownerId: "teacher", code: "OTHER", isPublished: true }), false);
    assert.equal(isRankedExam({ ownerId: null, code: "USER-ORPHAN", isPublished: true }), false);
    assert.equal(isRankedExam({ ownerId: null, code: "SYSTEM-1", isPublished: false }), false);
  });
  it("suppresses all rewards even for a perfect personal-exam submission", () => {
    const input = {
      questionScores: [{ questionId: "q1", score: 1, maxScore: 1, isCorrect: true }],
      score: 1, maxScore: 1, durationSeconds: 10, durationMinutes: 30,
      examType: "PRACTICE" as const, previousAttemptCount: 0, todayEarnedExp: 0,
      activityDates: [], now: new Date("2026-11-24T00:00:00Z"),
    };
    assert.equal(calculateExamExp({ ...input, rankedEligible: false }).expReward, 0);
    assert.ok(calculateExamExp({ ...input, rankedEligible: true }).expReward > 0);
  });
});
