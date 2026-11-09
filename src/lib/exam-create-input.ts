import { z } from "zod";
import { fitsExamRichField } from "@/lib/rich-image-security";

const questionSchema = z.object({
  prompt: z.string().trim().min(3).refine((value) => fitsExamRichField(value, 2500), "Nội dung câu hỏi quá dài hoặc ảnh vượt giới hạn"),
  options: z.array(z.string().trim().min(1).refine((value) => fitsExamRichField(value, 600), "Phương án quá dài hoặc ảnh vượt giới hạn")).min(2).max(6),
  correctIndex: z.number().int().min(0).max(5),
  explanation: z.string().trim().refine((value) => fitsExamRichField(value, 2000), "Lời giải quá dài hoặc ảnh vượt giới hạn").optional(),
  passage: z.string().trim().refine((value) => fitsExamRichField(value, 50000), "Ngữ liệu quá dài hoặc ảnh vượt giới hạn").optional(),
}).strict();

export const createExamSchema = z.object({
  title: z.string().trim().min(3).max(160),
  subjectId: z.string().min(1).max(128),
  educationLevel: z.enum(["THCS", "THPT", "EXAM_10", "THPTQG"]),
  durationMinutes: z.number().int().min(5).max(300),
  // Personal practice exams have no fixed question-count cap; request bytes are still bounded.
  questions: z.array(questionSchema).min(1),
  shareMode: z.enum(["PUBLIC", "PASSWORD", "RESTRICTED"]).default("RESTRICTED"),
  sharePassword: z.string().trim().max(128).optional(),
  allowedEmails: z.array(z.string().trim().email().max(254)).max(100).default([]),
}).strict();
