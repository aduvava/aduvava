import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createExamSchema } from "../src/lib/exam-create-input";

const valid = {
  title: "Đề thi thử Toán",
  subjectId: "subject123",
  educationLevel: "THPT",
  durationMinutes: 45,
  questions: [{ prompt: "Một cộng một bằng mấy?", options: ["Một", "Hai"], correctIndex: 1 }],
};

describe("user exam input bounds", () => {
  it("accepts ordinary exam creation", () => {
    assert.equal(createExamSchema.safeParse(valid).success, true);
  });

  it("allows more than 100 personal questions, including THPTQG practice", () => {
    const questions = Array.from({ length: 251 }, () => ({ ...valid.questions[0] }));
    assert.equal(createExamSchema.safeParse({ ...valid, questions }).success, true);
    assert.equal(createExamSchema.safeParse({
      ...valid, educationLevel: "THPTQG", durationMinutes: 25,
      questions: [valid.questions[0]],
    }).success, true);
  });

  it("still rejects an empty exam", () => {
    assert.equal(createExamSchema.safeParse({ ...valid, questions: [] }).success, false);
  });

  it("rejects unbounded question content", () => {
    const question = valid.questions[0];
    assert.equal(createExamSchema.safeParse({ ...valid, questions: [{ ...question, prompt: "x".repeat(2501) }] }).success, false);
    assert.equal(createExamSchema.safeParse({ ...valid, questions: [{ ...question, options: ["A".repeat(601), "B"] }] }).success, false);
    assert.equal(createExamSchema.safeParse({ ...valid, questions: [{ ...question, explanation: "x".repeat(2001) }] }).success, false);
  });

  it("accepts a bounded inline diagram without accepting oversized prose", () => {
    const safeData = "data:image/png;base64," + "A".repeat(300_000);
    const question = { ...valid.questions[0], prompt: `Xem hình ![hình](${safeData}) rồi tính đáp án` };
    assert.equal(createExamSchema.safeParse({ ...valid, questions: [question] }).success, true);
    assert.equal(createExamSchema.safeParse({ ...valid, questions: [{ ...question, prompt: "V".repeat(2501) }] }).success, false);
  });
  it("rejects too many invited users and unexpected fields", () => {
    assert.equal(createExamSchema.safeParse({ ...valid, allowedEmails: Array.from({ length: 101 }, (_, i) => `a${i}@example.test`) }).success, false);
    assert.equal(createExamSchema.safeParse({ ...valid, role: "ADMIN" }).success, false);
    assert.equal(createExamSchema.safeParse({ ...valid, questions: [{ ...valid.questions[0], isCorrect: true }] }).success, false);
  });
});
