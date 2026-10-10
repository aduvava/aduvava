import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPrefixes = ["/dashboard", "/teacher", "/leaderboard", "/classes", "/subjects", "/exams", "/attempts", "/results", "/theory", "/documents", "/notifications", "/dich-vu", "/vip"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isAdminLogin = pathname.startsWith("/admin/login");
  const isAdmin = (pathname.startsWith("/admin") && !isAdminLogin) || pathname.startsWith("/api/admin");

  if (!isProtected && !isAdmin) return NextResponse.next();

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = new URL(isAdmin ? "/admin/login" : "/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isAdmin && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/teacher") && token.role !== "TEACHER" && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/dashboard") && token.role === "TEACHER") {
    return NextResponse.redirect(new URL("/teacher", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/teacher/:path*", "/leaderboard/:path*", "/classes/:path*", "/subjects/:path*", "/exams/:path*", "/attempts/:path*", "/results/:path*", "/theory/:path*", "/documents/:path*", "/notifications/:path*", "/dich-vu/:path*", "/vip/:path*", "/admin/:path*", "/api/admin/:path*"]
};
