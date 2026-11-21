import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAssessmentRows } from "../src/lib/special-exam-file-import";
import { getAssessmentVariant, flattenAssessmentBlocks } from "../src/lib/special-exam-rules";
import { validateOfficialSpecialExam } from "../src/lib/official-special-exam-publication";
import type { OfficialExamQuestion } from "../src/lib/official-exam-publication";

const variant = getAssessmentVariant("HSA", "EN")!;
const blocks = flattenAssessmentBlocks(variant);
const shortPositions = new Set([1, 3, 7, 9, 12, 16, 18, 20, 22, 27, 29, 34, 37, 42, 49]);

function sourceSheet(shorts = shortPositions, withPassage = false) {
  const rows: unknown[][] = [["no", "question", "A", "B", "C", "D", "correct", "type", "group_id"]];
  for (let i = 1; i <= 150; i++) {
    const isShort = shorts.has(i);
    rows.push([
      i > 100 ? i + 500 : i,
      "Câu hỏi thật " + i,
      ...(isShort ? ["", "", "", ""] : ["Một", "Hai", "Ba", "Bốn"]),
      isShort ? "5341" : "B",
      isShort ? "Điền đáp án" : "Trắc nghiệm",
      i === 70 && withPassage ? "RD1" : "",
    ]);
  }
  return rows;
}

function toOfficial(questions: ReturnType<typeof parseAssessmentRows>["questions"]): OfficialExamQuestion[] {
  return questions.map((question, index) => ({
    position: index + 1, type: question.type, points: 1, prompt: question.prompt,
    correctText: question.correctText,
    answerOptions: (question.options ?? []).filter(Boolean).map((value, i) => ({
      isCorrect: "ABCD"[i] === question.correct,
    })),
  }));
}

describe("Excel importer for HSA and separate aptitude exams", () => {
  it("keeps original question order even when mathematical short answers are interleaved", () => {
    const passages = [
      ["group_id", "type", "title", "instruction", "passage"],
      ["RD1", "reading", "Ngữ liệu", "Hãy đọc", "Đoạn văn dùng chung"],
    ];
    const parsed = parseAssessmentRows(sourceSheet(shortPositions, true), blocks, passages);
    assert.equal(parsed.questions.length, 150);
    assert.equal(parsed.questions[0].type, "SHORT_ANSWER");
    assert.equal(parsed.questions[0].correctText, "5341");
    assert.equal(parsed.questions[1].type, "SINGLE_CHOICE");
    assert.equal(parsed.questions[35].type, "SINGLE_CHOICE");
    assert.equal(parsed.questions[69].passage, "Ngữ liệu\n\nHãy đọc\n\nĐoạn văn dùng chung");
    assert.match(parsed.warnings.join(" "), /Số thứ tự nguồn/);
    assert.doesNotThrow(() => validateOfficialSpecialExam({
      track: "HSA", variantId: "EN", durationMinutes: 195,
      questions: toOfficial(parsed.questions),
    }));
  });

  it("preserves embedded diagrams on BAI_DOC and warns about unlinked passage images", () => {
    const illustration = "data:image/png;base64,aGVsbG8=";
    const passages = [
      ["group_id", "type", "title", "instruction", "passage"],
      ["RD1", "reading", "Ngữ liệu", "Xem hình", "Đoạn văn dùng chung"],
    ];
    const passageImages = new Map<number, string[]>([[2, [illustration]], [4, [illustration]]]);
    const parsed = parseAssessmentRows(sourceSheet(shortPositions, true), blocks, passages,
      new Map<number, string[]>(), passageImages);
    assert.equal(parsed.questions[69].passage,
      "Ngữ liệu\n\nXem hình\n\nĐoạn văn dùng chung\n\n![Hình minh họa](" + illustration + ")");
    assert.match(parsed.warnings.join(" "), /BAI_DOC ở dòng 4/);
  });

  it("rejects oversized BAI_DOC illustrations instead of silently stripping them", () => {
    const passages = [
      ["group_id", "passage"],
      ["RD1", "Ngữ liệu"],
    ];
    const oversized = "data:image/png;base64," + "A".repeat(350000);
    assert.throws(() => parseAssessmentRows(sourceSheet(shortPositions, true), blocks, passages,
      new Map<number, string[]>(), new Map([[2, [oversized]]])),
    /BAI_DOC dòng 2.*giảm dung lượng ảnh/);
  });

  it("reports corrupt choices without inventing answers and keeps incomplete draft data", () => {
    const sheet = sourceSheet();
    sheet[5] = [5, "Bài toán PDF lỗi", "A. Một B. Hai C. Ba D. Bốn", "", "", "", "D", "Trắc nghiệm", ""];
    const parsed = parseAssessmentRows(sheet, blocks);
    assert.deepEqual(parsed.questions[4].options, ["A. Một B. Hai C. Ba D. Bốn", "", "", ""]);
    assert.match(parsed.warnings.join(" "), /Câu 5.*thiếu/);
    assert.throws(() => validateOfficialSpecialExam({
      track: "HSA", variantId: "EN", durationMinutes: 195, questions: toOfficial(parsed.questions),
    }), /Câu 5/);
  });

  it("marks missing numerical questions as publish-blocking instead of changing their type", () => {
    const shorts = new Set([...shortPositions].filter((n) => n !== 49));
    const parsed = parseAssessmentRows(sourceSheet(shorts), blocks);
    assert.equal(parsed.questions.filter((q) => q.type === "SHORT_ANSWER").length, 14);
    assert.throws(() => validateOfficialSpecialExam({
      track: "HSA", variantId: "EN", durationMinutes: 195, questions: toOfficial(parsed.questions),
    }), /15 câu điền đáp án/);
  });

  it("infers answer type from unambiguous data and rejects unknown explicit types", () => {
    const input = [["question", "correct"], ["Số nguyên cần điền", "3.5"]];
    assert.equal(parseAssessmentRows(input, blocks).questions[0].type, "SHORT_ANSWER");
    assert.throws(() => parseAssessmentRows([["question", "type"], ["Môn gì", "Không rõ"]], blocks), /Dòng 2/);
  });
});
