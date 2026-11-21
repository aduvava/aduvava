import { assessmentQuestionCount, flattenAssessmentBlocks, getAssessmentRule, getAssessmentVariant } from "@/lib/special-exam-rules";
import type { OfficialExamQuestion } from "@/lib/official-exam-publication";

/**
 * Validate a complete DGNL paper before it can be published. This deliberately
 * does not infer variants or overwrite records from the legacy exam bank.
 */
export function validateOfficialSpecialExam(input: {
  track: string;
  variantId: string;
  durationMinutes: number;
  questions: OfficialExamQuestion[];
}) {
  const rule = getAssessmentRule(input.track);
  if (!rule) throw new Error("Kỳ thi ĐGNL chưa được hỗ trợ.");
  const variant = rule.variants.find((item) => item.id === input.variantId);
  if (!variant) throw new Error("Hãy chọn tổ hợp/mã bài thi hợp lệ trước khi xuất bản ĐGNL.");
  if (input.durationMinutes !== rule.durationMinutes) {
    throw new Error("Đề " + rule.label + " phải có thời gian " + rule.durationMinutes + " phút.");
  }
  const count = assessmentQuestionCount(variant);
  if (input.questions.length !== count) {
    throw new Error("Đề " + rule.label + " cần đúng " + count + " câu; hiện có " + input.questions.length + ".");
  }
  const sorted = [...input.questions].sort((a, b) => a.position - b.position);
  const blocks = flattenAssessmentBlocks(variant);
  // Some exams (HSA) mix A–D and numerical answers throughout a whole part.
  // Keep question positions intact; validate the total by part, not a fixed suffix.
  let partStart = 0;
  for (const part of variant.parts) {
    const partCount = part.blocks.reduce((sum, block) => sum + block.count, 0);
    if (part.requiredShortAnswers !== undefined) {
      const actual = sorted.slice(partStart, partStart + partCount)
        .filter((question) => question.type === "SHORT_ANSWER").length;
      if (actual !== part.requiredShortAnswers) {
        throw new Error(part.label + ": cần đúng " + part.requiredShortAnswers +
          " câu điền đáp án (hiện có " + actual + ").");
      }
    }
    partStart += partCount;
  }
  for (const block of blocks) {
    const current = sorted.slice(block.start - 1, block.end);
    const requiredShort = block.requiredShortAnswers ?? null;
    if (requiredShort !== null && current.filter((question) => question.type === "SHORT_ANSWER").length !== requiredShort) {
      throw new Error(block.label + ": cần đúng " + requiredShort + " câu điền đáp án.");
    }
    for (let j = 0; j < current.length; j++) {
      const question = current[j];
      const position = block.start + j;
      if (question.position !== position) throw new Error("Đề ĐGNL phải đánh số câu liên tục, đúng thứ tự các phần.");
      if (!(block.allowedTypes ?? [block.questionType]).includes(question.type)) {
        throw new Error("Câu " + position + " (" + block.label + ") có dạng câu sai.");
      }
      if (!Number.isFinite(question.points) || Math.abs(question.points - block.pointsPerQuestion) > 0.000001) {
        throw new Error("Câu " + position + " phải có " + block.pointsPerQuestion + " điểm.");
      }
      if (!question.prompt.trim()) throw new Error("Câu " + position + " chưa có nội dung.");
      if (question.type === "SINGLE_CHOICE" &&
          (question.answerOptions.length !== 4 || question.answerOptions.filter((option) => option.isCorrect).length !== 1)) {
        throw new Error("Câu " + position + " cần 4 phương án và đúng một đáp án.");
      }
      if (question.type === "TRUE_FALSE_SET" && question.answerOptions.length !== 4) {
        throw new Error("Câu " + position + " Đúng/Sai cần 4 mệnh đề.");
      }
      if (question.type === "SHORT_ANSWER" && !question.correctText?.trim()) {
        throw new Error("Câu " + position + " trả lời ngắn phải có đáp án.");
      }
    }
  }
  const total = sorted.reduce((sum, q) => sum + q.points, 0);
  const expected = rule.scoreMode === "IRT" ? count : rule.maxPoints;
  if (Math.abs(total - expected) > 0.001) throw new Error("Tổng điểm thô không khớp cấu trúc " + rule.label + ".");
  return { ...rule, variantId: variant.id, variantLabel: variant.label };
}

export function getStoredAssessmentVariantId(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const variantId = (value as Record<string, unknown>).variantId;
  return typeof variantId === "string" ? variantId : null;
}
