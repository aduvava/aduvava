// Khối thi đánh giá năng lực / đánh giá tư duy trong Ôn thi THPTQG.
// Persist the code inside Exam.examStructure (JSON) so existing installations
// do not need a database migration and official THPTQG structures remain intact.
export const assessmentCodes = ["HSA", "TSA", "V-ACT", "QDA", "BQA", "ĐGNL BCA"] as const;

export type AssessmentCode = (typeof assessmentCodes)[number];

export function isAssessmentCode(value: unknown): value is AssessmentCode {
  return typeof value === "string" && (assessmentCodes as readonly string[]).includes(value);
}

export function getAssessmentCode(structure: unknown): AssessmentCode | null {
  if (typeof structure !== "object" || structure === null || Array.isArray(structure)) return null;
  const code = (structure as Record<string, unknown>).assessmentCode;
  return isAssessmentCode(code) ? code : null;
}

export function isValidAssessmentExam(
  family: string | null | undefined,
  educationLevel: string | null | undefined,
  structure: unknown,
): boolean {
  const code = getAssessmentCode(structure);
  return !code || (family === "DGNL" && educationLevel === "THPTQG");
}
