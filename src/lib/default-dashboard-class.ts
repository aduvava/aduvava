import { normalizeSchoolGrade } from "@/data/profile-options";

// Home selection belongs to the signed-in account, not the last grade browsed.
// Students without a saved grade complete onboarding before seeing the dashboard.
export function getDefaultDashboardClass(profileGrade?: string | null) {
  const grade = normalizeSchoolGrade(profileGrade);
  if (!grade) return { groupId: "secondary", className: "Lớp 6" } as const;

  return {
    groupId: Number(grade) <= 9 ? "secondary" : "high-school",
    className: `Lớp ${grade}`,
  } as const;
}
