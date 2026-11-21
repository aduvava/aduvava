import assert from "node:assert/strict";
import { test } from "node:test";
import templates from "../src/data/special-exam-templates.json";
import { scoreExam, scoreQuestion } from "../src/lib/scoring";

const { parseAdminExamQuestions, getAssessmentSpec } = require("../admin-server/exam-question-import.js") as {
  getAssessmentSpec: (track: string, variant: string) => { questionCount: number };
  parseAdminExamQuestions: (
    content: string,
    config: Record<string, unknown>,
    normalize: (question: Record<string, unknown>, index: number) => Record<string, unknown>,
    parseSimple: (value: string) => unknown[]
  ) => { questions: Array<{ type: string; points: number }>; rule: { scoreMode: string } };
};

const normalize = (input: Record<string, unknown>) => {
  const options = input.options as string[];
  const correct = String(input.correct ?? "A");
  return {
    prompt: String(input.prompt),
    answers: options.map((value, index) => ({ label: String.fromCharCode(65 + index), content: value })),
    correct,
    explanation: "",
  };
};

const asRecords = (variant: (typeof templates)["HSA"]["variants"][number]) =>
  variant.parts.flatMap((part) => part.blocks.flatMap((block) =>
    Array.from({ length: block.count }, (_, index) => {
      const type = "requiredShortAnswers" in block && Number(block.requiredShortAnswers) > 0
        && index >= block.count - Number(block.requiredShortAnswers) ? "SHORT_ANSWER" : block.questionType;
      if (type === "ESSAY") return { type, blockKey: block.key, prompt: "Viết bài nghị luận." };
      if (type === "SHORT_ANSWER") return { type, blockKey: block.key, prompt: "Nhập số phù hợp", correctText: "42" };
      return { type, blockKey: block.key, prompt: "Chọn phương án đúng", options: ["A", "B", "C", "D"], correct: "A" };
    }))));

test("five assessment exams enforce the correct total, weights and all variants", () => {
  for (const [track, spec] of Object.entries(templates)) {
    for (const variant of spec.variants) {
      const questions = asRecords(variant as (typeof templates)["HSA"]["variants"][number]);
      const expected = track === "DGNL_BCA" ? 81 : track === "V_ACT" ? 120 : track === "TSA" ? 100 : 150;
      assert.equal(questions.length, expected, track + " " + variant.id);
      const parsed = parseAdminExamQuestions(JSON.stringify({ questions }), {
        educationLevel: "THPTQG", subjectSlug: "toan", durationMinutes: spec.durationMinutes,
        specialExamTrack: track, specialExamVariant: variant.id,
      }, normalize, () => []);
      assert.equal(parsed.questions.length, expected);
      assert.equal(getAssessmentSpec(track, variant.id).questionCount, expected);
      const max = parsed.questions.reduce((sum, question) => sum + question.points, 0);
      assert.equal(max, spec.scoreMode === "IRT" ? expected : spec.maxPoints);
    }
  }
});

test("assessment importer rejects missing questions and wrong variants", () => {
  const input = JSON.stringify({ questions: asRecords(templates.HSA.variants[0]).slice(0, -1) });
  assert.throws(() => parseAdminExamQuestions(input, {
    educationLevel: "THPTQG", subjectSlug: "toan", durationMinutes: 195,
    specialExamTrack: "HSA", specialExamVariant: "EN",
  }, normalize, () => []), /đúng 150 câu/);
  assert.throws(() => getAssessmentSpec("QDA", "KHONG_CO"), /tổ hợp/);
});

test("TSA grouped questions require all four statements correct", () => {
  const question = { id: "q", type: "TRUE_FALSE_SET" as const, points: 1,
    answerOptions: [true, false, true, false].map((isCorrect, i) => ({
      id: String(i), isCorrect,
    })),
  };
  assert.equal(scoreQuestion(question, { "0": true, "1": false, "2": true }, { specialExamTrack: "TSA" }).score, 0);
  assert.equal(scoreQuestion(question, { "0": true, "1": false, "2": true }).score, 0.5);
});

test("BCA essay remains ungraded until an Admin grades it", () => {
  const result = scoreExam([{ id: "essay", type: "ESSAY", points: 25, answerOptions: [] }],
    [{ questionId: "essay", value: "Bài văn hoàn chỉnh" }], { specialExamTrack: "DGNL_BCA" });
  assert.equal(result.score, 0);
  assert.equal(result.maxScore, 25);
  assert.equal(result.questionScores[0].isCorrect, null);
});
