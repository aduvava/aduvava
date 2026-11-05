import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isStudentOnboardingComplete, isTeacherOnboardingComplete, safePostLoginPath } from "@/lib/onboarding";

const selectedRoles = new Set(["student", "teacher", "admin"]);

// A relative Location header keeps the login cookie on the original host.
// This matters behind reverse proxies and on local preview servers.
function redirectOnSameHost(path: string) {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: path, "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  const role = request.nextUrl.searchParams.get("role");
  if (!role || !selectedRoles.has(role)) return redirectOnSameHost("/login");

  const fallback = role === "teacher" ? "/teacher" : role === "admin" ? "/admin" : "/dashboard";
  const destination = safePostLoginPath(request.nextUrl.searchParams.get("callbackUrl"), fallback);
  const user = await getCurrentUser();
  if (!user) {
    return redirectOnSameHost("/login?role=" + encodeURIComponent(role) + "&callbackUrl=" + encodeURIComponent(destination));
  }

  // The stored role is the highest entitlement, never a cookie-based claim.
  const stored = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (!stored) return redirectOnSameHost("/login");
  if (role === "admin" && stored.role !== "ADMIN") {
    return redirectOnSameHost("/login?role=admin");
  }
  if (role === "teacher" && stored.role === "STUDENT") {
    await prisma.user.updateMany({
      where: { id: user.id, role: "STUDENT" },
      data: { role: "TEACHER" },
    });
  }

  // An existing profile is reusable across sessions and roles. Only request
  // missing fields, without forcing a grade on teachers.
  const profile = role === "admin" ? null : await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { grade: true, school: true, province: true },
  });
  const complete = role === "admin" || (role === "teacher"
    ? isTeacherOnboardingComplete(profile)
    : isStudentOnboardingComplete(profile));
  const safeDestination = role === "teacher"
    ? destination.startsWith("/admin") || destination.startsWith("/dashboard") ? "/teacher" : destination
    : role === "student"
      ? destination.startsWith("/admin") || destination.startsWith("/teacher") ? "/dashboard" : destination
      : destination;
  const target = complete
    ? safeDestination
    : "/onboarding?callbackUrl=" + encodeURIComponent(safeDestination);
  const response = redirectOnSameHost(target);
  response.cookies.set("educhi_active_role", role.toUpperCase(), {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return response;
}
