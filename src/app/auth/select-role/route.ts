import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { safePostLoginPath } from "@/lib/onboarding";

const selectedRoles = new Set(["student", "teacher", "admin"]);

export async function GET(request: NextRequest) {
  const role = request.nextUrl.searchParams.get("role");
  if (!role || !selectedRoles.has(role)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const user = await getCurrentUser();
  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("role", role);
    login.searchParams.set("callbackUrl", safePostLoginPath(request.nextUrl.searchParams.get("callbackUrl"), role === "teacher" ? "/teacher" : "/dashboard"));
    return NextResponse.redirect(login);
  }

  // The stored role is an entitlement, not the chosen mode. A teacher always
  // remains eligible to use the student dashboard without losing any data.
  const stored = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (!stored) return NextResponse.redirect(new URL("/login", request.url));
  if (role === "admin" && stored.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login?role=admin", request.url));
  }
  if (role === "teacher" && stored.role === "STUDENT") {
    await prisma.user.updateMany({
      where: { id: user.id, role: "STUDENT" },
      data: { role: "TEACHER" },
    });
  }

  const fallback = role === "teacher" ? "/teacher" : role === "admin" ? "/admin" : "/dashboard";
  const destination = safePostLoginPath(request.nextUrl.searchParams.get("callbackUrl"), fallback);
  const next = new URL("/auth/continue", request.url);
  next.searchParams.set("callbackUrl", destination);

  const response = NextResponse.redirect(next);
  response.cookies.set("educhi_active_role", role.toUpperCase(), {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return response;
}
