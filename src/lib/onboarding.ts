import { z } from "zod";
import { SCHOOL_GRADES, VIETNAM_PROVINCES } from "@/data/profile-options";

export type StudentOnboardingProfile = {
  grade?: string | null;
  school?: string | null;
  province?: string | null;
};

export function isStudentOnboardingComplete(profile: StudentOnboardingProfile | null | undefined): boolean {
  return Boolean(profile?.grade?.trim() && profile.school?.trim() && profile.province?.trim());
}

export function isTeacherOnboardingComplete(profile: StudentOnboardingProfile | null | undefined): boolean {
  return Boolean(profile?.school?.trim() && profile.province?.trim());
}

// Never redirect to another origin or a login/onboarding loop after authentication.
export function safePostLoginPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    const parsed = new URL(value, "https://eduva.invalid");
    if (parsed.origin !== "https://eduva.invalid") return fallback;
    const blocked = ["/api", "/login", "/register", "/onboarding", "/auth/continue", "/auth/select-role"];
    if (blocked.some((prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(prefix + "/"))) return fallback;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}

export const completeStudentProfileSchema = z.object({
  grade: z.string().trim().refine((value) => SCHOOL_GRADES.includes(value), "Vui lòng chọn lớp hợp lệ"),
  school: z.string().trim().min(2).max(160),
  province: z.string().trim().refine((value) => VIETNAM_PROVINCES.includes(value as (typeof VIETNAM_PROVINCES)[number]), "Vui lòng chọn tỉnh/thành hợp lệ"),
  source: z.literal("onboarding"),
}).strict();

export const completeTeacherProfileSchema = z.object({
  school: z.string().trim().min(2).max(160),
  province: z.string().trim().refine((value) => VIETNAM_PROVINCES.includes(value as (typeof VIETNAM_PROVINCES)[number]), "Vui lòng chọn tỉnh/thành hợp lệ"),
  source: z.literal("onboarding"),
}).strict();
