/** Shared grade choices for system exams. Keep legacy unclassified records editable. */
export const EXAM_GRADES_BY_LEVEL = {
  THCS: ["Lớp 6", "Lớp 7", "Lớp 8", "Lớp 9"],
  THPT: ["Lớp 10", "Lớp 11", "Lớp 12"],
  EXAM_10: ["Ôn thi vào 10"],
  THPTQG: ["Ôn thi THPTQG"],
} as const;

export type ExamGradeLevel = keyof typeof EXAM_GRADES_BY_LEVEL;

export function gradesForExamLevel(level: string | null | undefined): readonly string[] {
  return level && Object.prototype.hasOwnProperty.call(EXAM_GRADES_BY_LEVEL, level)
    ? EXAM_GRADES_BY_LEVEL[level as ExamGradeLevel]
    : [];
}

export function defaultGradeForExamLevel(level: string | null | undefined): string | null {
  return level === "EXAM_10" || level === "THPTQG" ? gradesForExamLevel(level)[0] : null;
}

export function isValidExamGrade(
  level: string | null | undefined,
  grade: unknown,
  specialTrack: unknown = null,
): boolean {
  if (grade === null || grade === undefined) return true; // Legacy exams are not forcibly reassigned.
  if (typeof grade !== "string" || specialTrack) return false;
  return gradesForExamLevel(level).includes(grade);
}
