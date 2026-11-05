import { z } from "zod";
import { SCHOOL_GRADES } from "@/data/profile-options";

export const THEORY_GRADE_OPTIONS = [
  ...SCHOOL_GRADES.map((grade) => ({ value: `Lớp ${grade}`, label: `Lớp ${grade}` })),
  { value: "Ôn thi vào 10", label: "Ôn thi vào 10" },
  { value: "Ôn thi THPTQG", label: "Ôn thi THPTQG" },
];

export function gradeToLevel(grade: string): "THCS" | "THPT" | "EXAM_10" | "THPTQG" | null {
  if (grade === "Ôn thi vào 10") return "EXAM_10";
  if (grade === "Ôn thi THPTQG") return "THPTQG";
  const value = Number(grade.replace(/^Lớp\s+/u, ""));
  if (!SCHOOL_GRADES.includes(String(value))) return null;
  return value <= 9 ? "THCS" : "THPT";
}

export function theorySlug(value: string) {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 140);
  return normalized || "bai-ly-thuyet";
}

export const theoryLessonFormSchema = z.object({
  chapterId: z.string().min(1).max(200),
  title: z.string().trim().min(2).max(250),
  summary: z.string().trim().max(3000),
  content: z.string().trim().max(200000),
  position: z.coerce.number().int().min(0).max(100000),
  accessLevel: z.enum(["FREE", "PRO"]),
  isPublished: z.enum(["true", "false"]).transform((value) => value === "true"),
  removeFile: z.enum(["true", "false"]).transform((value) => value === "true"),
  lessonId: z.string().max(200),
}).strict();

export function theoryFileIsSupported(filename: string) {
  return /\.(pdf|docx)$/i.test(filename);
}
