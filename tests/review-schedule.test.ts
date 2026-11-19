import { test } from "node:test";
import assert from "node:assert/strict";
import { nextReviewState } from "../src/lib/review-schedule";

const now = new Date("2026-11-19T12:00:00Z");

test("wrong review resets streak and schedules a retry in 10 minutes", () => {
  const result = nextReviewState(2, false, now);
  assert.equal(result.correctStreak, 0);
  assert.equal(result.masteredAt, null);
  assert.equal(result.nextReviewAt.toISOString(), "2026-11-19T12:10:00.000Z");
});

test("correct reviews follow 1/3/7 day intervals", () => {
  const expected = [1, 3, 7];
  for (let streak = 0; streak < 3; streak += 1) {
    const result = nextReviewState(streak, true, now);
    assert.equal(result.correctStreak, streak + 1);
    assert.equal(result.nextReviewAt.getTime() - now.getTime(), expected[streak] * 86_400_000);
    assert.equal(Boolean(result.masteredAt), streak >= 2);
  }
});

test("unexpected negative streak cannot shorten the first review interval", () => {
  assert.equal(nextReviewState(-9, true, now).correctStreak, 1);
});
