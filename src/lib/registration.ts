import { z } from "zod";

// Public registration must never grant elevated roles such as TEACHER or ADMIN.
// Role changes are performed by an authenticated administrator.
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Password must be at most 72 bytes when encoded as UTF-8",
  ),
  grade: z.string().max(50).optional(),
  province: z.string().max(100).optional(),
  role: z.literal("STUDENT").optional(),
}).strict();
