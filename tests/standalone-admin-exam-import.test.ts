import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAdminExamQuestions } from "../admin-server/exam-question-import.js";

// The standalone Admin server supplies its existing TXT/CSV normalizers.
// Test the typed JSON format directly without starting an HTTP server.
function normalizeSingle(input: { prompt: string; options: string[]; correct: string; explanation?: string }, index: number) {
  assert.ok(input.prompt, "Câu " + index + " cần nội dung");
  assert.ok(Array.isArray(input.options) && input.options.length >= 2);
  return {
    prompt: input.prompt,
    answers: input.options.map((content, idx) => ({ label: String.fromCharCode(65 + idx), content })),
    correct: input.correct,
    explanation: input.explanation ?? "",
    points: 1,
  };
}
function parseSimple() { throw new Error("Không dùng parseSimple trong bài test JSON."); }
const settings = { educationLevel: "THPTQG", subjectSlug: "toan", durationMinutes: 90 };

function mathQuestions() {
  return [
    ...Array.from({ length: 12 }, (_, i) => ({
      type: "SINGLE_CHOICE", prompt: "Toán lựa chọn " + i, options: ["1", "2", "3", "4"], correct: "A",
    })),
    ...Array.from({ length: 4 }, (_, i) => ({
      type: "TRUE_FALSE_SET", prompt: "Toán đúng sai " + i,
      statements: [
        { content: "a", isCorrect: true }, { content: "b", isCorrect: false },
        { content: "c", isCorrect: true }, { content: "d", isCorrect: false },
      ],
    })),
    ...Array.from({ length: 6 }, (_, i) => ({
      type: "SHORT_ANSWER", prompt: "Toán trả lời ngắn " + i, correctText: "42",
    })),
  ];
}

describe("standalone Admin question import", () => {
  it("accepts a complete national Math structure and exact score", () => {
    const parsed = parseAdminExamQuestions(JSON.stringify({ questions: mathQuestions() }), settings, normalizeSingle, parseSimple);
    assert.equal(parsed.questions.length, 22);
    assert.deepEqual(parsed.questions.slice(12, 16).map((q: { type: string }) => q.type), Array(4).fill("TRUE_FALSE_SET"));
    assert.equal(parsed.questions[16].correctText, "42");
    const total = parsed.questions.reduce((sum: number, question: { points: number }) => sum + question.points, 0);
    assert.equal(total, 10);
  });
  it("blocks invalid official count and time", () => {
    assert.throws(() => parseAdminExamQuestions(
      JSON.stringify({ questions: mathQuestions().slice(0, 10) }), settings, normalizeSingle, parseSimple,
    ), /22 câu/);
    assert.throws(() => parseAdminExamQuestions(
      JSON.stringify({ questions: mathQuestions() }),
      { ...settings, durationMinutes: 60 }, normalizeSingle, parseSimple,
    ), /90 phút/);
  });
  it("allows arbitrary subject exams with more than 100 questions", () => {
    const questions = Array.from({ length: 205 }, (_, i) => ({
      prompt: "Tự luyện " + i, options: ["A", "B"], correct: "A",
    }));
    const parsed = parseAdminExamQuestions(
      JSON.stringify({ questions }),
      { educationLevel: "THCS", subjectSlug: "toan", durationMinutes: 15 },
      normalizeSingle, parseSimple,
    );
    assert.equal(parsed.questions.length, 205);
    assert.equal(parsed.rule, null);
  });
  it("allows essay and short answers on non-national admin exams", () => {
    const parsed = parseAdminExamQuestions(JSON.stringify({ questions: [
      { type: "ESSAY", prompt: "Phân tích tác phẩm", points: 5 },
      { type: "SHORT_ANSWER", prompt: "Tính nhanh", correctText: "2", points: 2 },
    ] }), { educationLevel: "THPT", subjectSlug: "ngu-van", durationMinutes: 40 }, normalizeSingle, parseSimple);
    assert.deepEqual(parsed.questions.map((q: { type: string }) => q.type), ["ESSAY", "SHORT_ANSWER"]);
  });
});
