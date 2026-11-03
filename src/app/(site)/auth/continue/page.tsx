import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isStudentOnboardingComplete, safePostLoginPath } from "@/lib/onboarding";

export default async function ContinueAfterLogin({ searchParams }: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=" + encodeURIComponent("/auth/continue"));

  if (user.role === "ADMIN") redirect(safePostLoginPath(params.callbackUrl, "/admin"));
  if (user.role === "TEACHER") {
    const destination = safePostLoginPath(params.callbackUrl, "/teacher");
    redirect(destination.startsWith("/admin") || destination.startsWith("/dashboard") ? "/teacher" : destination);
  }

  const destination = safePostLoginPath(params.callbackUrl, "/dashboard");
  const studentDestination = destination.startsWith("/admin") || destination.startsWith("/teacher") ? "/dashboard" : destination;
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { grade: true, school: true, province: true },
  });

  if (!isStudentOnboardingComplete(profile)) {
    redirect("/onboarding?callbackUrl=" + encodeURIComponent(studentDestination));
  }
  redirect(studentDestination);
}
