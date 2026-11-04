export const learningGrades = ["Lớp 6", "Lớp 7", "Lớp 8", "Lớp 9", "Lớp 10", "Lớp 11", "Lớp 12", "Ôn thi vào 10", "Ôn thi THPTQG"] as const;
export function learningContext(grade: string) {
  const educationLevel = grade === "Ôn thi THPTQG" ? "THPTQG" : grade === "Ôn thi vào 10" ? "EXAM_10" : Number(grade.slice(4)) <= 9 ? "THCS" : "THPT";
  return { educationLevel, grade: grade.startsWith("Ôn thi") ? "Môn thi" : grade } as const;
}
export function chapterMatches(chapter: { subjectId: string; educationLevel: string | null; grade: string | null }, subjectId: string, grade: string) {
  const context = learningContext(grade);
  return chapter.subjectId === subjectId && (!chapter.educationLevel || chapter.educationLevel === context.educationLevel) && (!chapter.grade || chapter.grade === context.grade);
}
