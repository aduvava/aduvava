import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildLearningMap,
  scopeOfAttempt,
  type LearningAnswer,
  type LearningAttempt,
} from "../src/lib/learning-insights";

function attempt(id: string, overrides: Partial<LearningAttempt> = {}): LearningAttempt {
  return {
    id, examId: "exam-" + id, examTitle: "Đề " + id,
    subjectId: "math", subjectName: "Toán", subjectSlug: "toan",
    educationLevel: "THPT", grade: "11", specialExamTrack: null,
    score: 7, maxScore: 10,
    ...overrides,
  };
}

function answer(attemptId: string, id: string, overrides: Partial<LearningAnswer> = {}): LearningAnswer {
  return {
    attemptId, questionId: id, type: "SINGLE_CHOICE", score: 0,
    points: 1, topicId: null, topicName: null,
    ...overrides,
  };
}

test("legacy untagged answers still produce real subject, exam and type cards", () => {
  const a = [attempt("a", { score: 4 }), attempt("b", { score: 6 })];
  const ans = [
    answer("a", "q1"),
    answer("a", "q2", { score: 1 }),
    answer("b", "q3", { type: "SHORT_ANSWER", score: 1 }),
  ];
  const result = buildLearningMap(a, ans);
  assert.equal(result.submittedCount, 2);
  assert.equal(result.gradedCount, 3);
  assert.equal(result.untaggedCount, 3);
  assert.equal(result.topics.length, 0);
  assert.equal(result.subjects.length, 1);
  assert.equal(result.subjects[0].percent, 50);
  assert.equal(result.subjects[0].count, 2);
  assert.equal(result.types.length, 2);
  assert.equal(result.exams.length, 2);
  assert.equal(result.recommendation.title, "Ưu tiên môn Toán");
});

test("grade selection never mixes grade 10 with grade 11", () => {
  const a = [
    attempt("a", { educationLevel: "THPT", grade: "11" }),
    attempt("b", { educationLevel: "THPT", grade: "10", score: 2 }),
  ];
  const ans = [answer("a", "q1"), answer("b", "q2")];
  const eleven = buildLearningMap(a, ans, undefined, "11");
  assert.equal(eleven.selectedScope, "grade:11");
  assert.equal(eleven.submittedCount, 1);
  assert.equal(eleven.gradedCount, 1);
  const ten = buildLearningMap(a, ans, "grade:10", "11");
  assert.equal(ten.selectedScope, "grade:10");
  assert.equal(ten.submittedCount, 1);
  assert.equal(ten.gradedCount, 1);
  assert.equal(ten.subjects[0].percent, 20);
});

test("special assessment exams override grade to stay in separate scopes", () => {
  const scoped = scopeOfAttempt(attempt("a", {
    educationLevel: "THPTQG", grade: "12", specialExamTrack: "HSA",
  }));
  assert.deepEqual(scoped, { key: "track:HSA", label: "HSA" });
  assert.equal(scopeOfAttempt(attempt("b", { educationLevel: "EXAM_10" })).key, "exam10");
});

test("topic percentages use points and only explicitly assigned topic ids", () => {
  const a = [attempt("a"), attempt("b")];
  const ans = [
    answer("a", "q1", { topicId: "topic-a", topicName: "Hàm số", points: 2, score: 1 }),
    answer("b", "q2", { topicId: "topic-a", topicName: "Hàm số", points: 2, score: 2 }),
    answer("a", "q3", { topicId: null, topicName: null, points: 1, score: 1 }),
  ];
  const result = buildLearningMap(a, ans);
  assert.equal(result.topics.length, 1);
  assert.equal(result.topics[0].label, "Hàm số");
  assert.equal(result.topics[0].percent, 75);
  assert.equal(result.topics[0].enough, false);
  assert.equal(result.untaggedCount, 1);
});

test("one weak attempt is not enough for a subject-level weakness claim", () => {
  const result = buildLearningMap([attempt("a", { score: 1 })], [answer("a", "q1")]);
  assert.equal(result.subjects[0].percent, 10);
  assert.equal(result.subjects[0].enough, false);
  assert.equal(result.recommendation.title, "Tiếp tục duy trì tiến độ");
});

test("no attempts gets useful getting-started guidance rather than empty warning", () => {
  const result = buildLearningMap([], []);
  assert.equal(result.submittedCount, 0);
  assert.equal(result.subjects.length, 0);
  assert.match(result.recommendation.title, /Bắt đầu/);
});
