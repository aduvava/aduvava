import { getNationalExamRule, getNationalQuestionCount, type NationalExamRule } from "@/lib/national-exam-rules";

// Only administrator-published THPTQG exams carry an enforced official structure.
// Student/teacher-created PRACTICE exams may use THPTQG as a study level without
// claiming to have the official number, types or timing of questions.
export type OfficialExamQuestion = {
  position: number;
  type: "SINGLE_CHOICE" | "TRUE_FALSE_SET" | "SHORT_ANSWER" | "ESSAY";
  points: number;
  prompt: string;
  correctText?: string | null;
  answerOptions: { isCorrect: boolean }[];
};

export function validateOfficialNationalExam(input: {
  educationLevel: string | null;
  subjectSlug: string;
  durationMinutes: number;
  questions: OfficialExamQuestion[];
}): NationalExamRule | null {
  if (input.educationLevel !== "THPTQG") return null;
  const rule = getNationalExamRule(input.subjectSlug);
  if (!rule) throw new Error("Môn học này chưa có cấu trúc THPTQG chính thức.");
  if (input.durationMinutes !== rule.durationMinutes) {
    throw new Error(`Đề THPTQG môn này phải có thời gian ${rule.durationMinutes} phút.`);
  }
  const requiredCount = getNationalQuestionCount(rule);
  if (input.questions.length !== requiredCount) {
    throw new Error(`Đề THPTQG cần đúng ${requiredCount} câu trước khi xuất bản.`);
  }

  const questions = [...input.questions].sort((a, b) => a.position - b.position);
  let cursor = 0;
  for (const part of rule.parts) {
    for (let localIndex = 0; localIndex < part.count; localIndex += 1) {
      const question = questions[cursor];
      const label = `Câu ${cursor + 1}`;
      if (question.position !== cursor + 1) {
        throw new Error("Đề THPTQG phải đánh số câu liên tục từ 1.");
      }
      if (question.type !== part.questionType) {
        throw new Error(`${label} thuộc ${part.label}, phải là ${part.questionType}.`);
      }
      if (!Number.isFinite(question.points) || Math.abs(question.points - part.pointsPerQuestion) > 0.000001) {
        throw new Error(`${label} cần ${part.pointsPerQuestion} điểm.`);
      }
      if (!question.prompt.trim()) throw new Error(`${label} chưa có nội dung.`);
      if (question.type === "SINGLE_CHOICE") {
        if (question.answerOptions.length < 2 ||
            question.answerOptions.filter((option) => option.isCorrect).length !== 1) {
          throw new Error(`${label} phải có các lựa chọn và đúng một đáp án đúng.`);
        }
      }
      if (question.type === "TRUE_FALSE_SET" && question.answerOptions.length !== 4) {
        throw new Error(`${label} Đúng/Sai phải có đúng 4 mệnh đề.`);
      }
      if (question.type === "SHORT_ANSWER" && !question.correctText?.trim()) {
        throw new Error(`${label} trả lời ngắn phải có đáp án để chấm.`);
      }
      cursor += 1;
    }
  }

  return rule;
}
