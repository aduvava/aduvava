import { z } from "zod";

const questionSchema = z.object({
  prompt: z.string().trim().min(3).max(2500),
  options: z.array(z.string().trim().min(1).max(600)).min(2).max(6),
  correctIndex: z.number().int().min(0).max(5),
  explanation: z.string().trim().max(2000).optional(),
}).strict();

export const createExamSchema = z.object({
  title: z.string().trim().min(3).max(160),
  subjectId: z.string().min(1).max(128),
  educationLevel: z.enum(["THCS", "THPT", "EXAM_10", "THPTQG"]),
  durationMinutes: z.number().int().min(5).max(300),
  questions: z.array(questionSchema).min(1).max(100),
  shareMode: z.enum(["PUBLIC", "PASSWORD", "RESTRICTED"]).default("PUBLIC"),
  sharePassword: z.string().trim().max(128).optional(),
  allowedEmails: z.array(z.string().trim().email().max(254)).max(100).default([]),
}).strict();
