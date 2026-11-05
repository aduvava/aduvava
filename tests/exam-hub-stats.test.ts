import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getAverageScore, getCompletionRate } from "../src/lib/exam-hub-stats";

describe("Real user exam stats", () => {
  it("handles empty and partially completed activity", () => {
    assert.equal(getCompletionRate(0, 0), 0);
    assert.equal(getCompletionRate(2, 4), 50);
    assert.equal(getCompletionRate(10, 4), 100);
  });
  it("normalizes submissions with different maximum scores to ten points", () => {
    assert.equal(getAverageScore([]), 0);
    assert.equal(getAverageScore([{ score: 5, maxScore: 10 }, { score: 40, maxScore: 40 }]), 7.5);
    assert.equal(getAverageScore([{ score: 0, maxScore: 0 }]), 0);
  });
});
