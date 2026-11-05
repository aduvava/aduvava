import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isStudentOnboardingComplete, isTeacherOnboardingComplete, safePostLoginPath } from "@/lib/onboarding";

export default async function ContinueAfterLogin({ searchParams }: {
  searchParams: Promise<{ role?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=" + encodeURIComponent("/auth/continue"));

  // Role is selected once per login, and can be changed later via the user menu.
  // Selection updates the cookie and the teacher entitlement server-side.
  if (params.role === "student" || params.role === "teacher" || params.role === "admin") {
    const destination = safePostLoginPath(params.callbackUrl, params.role === "teacher" ? "/teacher" : params.role === "admin" ? "/admin" : "/dashboard");
    redirect("/auth/select-role?role=" + params.role + "&callbackUrl=" + encodeURIComponent(destination));
  }

  if (user.role === "ADMIN") redirect(safePostLoginPath(params.callbackUrl, "/admin"));

  const destination = safePostLoginPath(params.callbackUrl, user.role === "TEACHER" ? "/teacher" : "/dashboard");
  const safeDestination = user.role === "TEACHER"
    ? destination.startsWith("/admin") || destination.startsWith("/dashboard") ? "/teacher" : destination
    : destination.startsWith("/admin") || destination.startsWith("/teacher") ? "/dashboard" : destination;

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { grade: true, school: true, province: true },
  });
  const completed = user.role === "TEACHER"
    ? isTeacherOnboardingComplete(profile)
    : isStudentOnboardingComplete(profile);
  if (!completed) redirect("/onboarding?callbackUrl=" + encodeURIComponent(safeDestination));

  redirect(safeDestination);
}
