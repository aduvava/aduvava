import assert from "node:assert/strict";
import { test } from "node:test";
import { scoreQuestion } from "../src/lib/scoring";

const numericQuestion = {
  id: "q1",
  type: "SHORT_ANSWER" as const,
  points: 1,
  correctText: "-3/4",
  answerOptions: [],
};

test("HSA/QDA accept mathematically equivalent signed fraction and decimal answers", () => {
  assert.equal(scoreQuestion(numericQuestion, "-0,75", { specialExamTrack: "HSA" }).score, 1);
  assert.equal(scoreQuestion(numericQuestion, "-0.75", { specialExamTrack: "QDA" }).score, 1);
  assert.equal(scoreQuestion(numericQuestion, "-3/4", { specialExamTrack: "QDA" }).score, 1);
  assert.equal(scoreQuestion(numericQuestion, "3/4", { specialExamTrack: "QDA" }).score, 0);
  assert.equal(scoreQuestion(numericQuestion, "-3/0", { specialExamTrack: "QDA" }).score, 0);
});

test("unrelated exams keep strict text-only short-answer grading", () => {
  assert.equal(scoreQuestion(numericQuestion, "-0,75").score, 0);
});
