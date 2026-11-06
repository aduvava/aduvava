import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPrefixes = ["/dashboard", "/teacher", "/leaderboard", "/classes", "/subjects", "/exams", "/attempts", "/results", "/theory", "/documents", "/notifications", "/dich-vu", "/vip"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // New uploads may be awaiting moderation. Direct static requests bypass the
  // document API authorization checks, so disallow them here.
  if (pathname.startsWith("/uploads/documents/")) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
    });
  }
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isAdminLogin = pathname.startsWith("/admin/login");
  const isAdminApi = pathname.startsWith("/api/admin/");
  const isAdmin = (pathname.startsWith("/admin") && !isAdminLogin) || isAdminApi;

  if (!isProtected && !isAdmin) return NextResponse.next();

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    // API callers must receive an actual authorization failure, not a
    // login HTML page with status 200 after following a redirect.
    if (isAdminApi) {
      return NextResponse.json({ error: "Authentication required" }, {
        status: 401, headers: { "Cache-Control": "no-store" },
      });
    }
    const url = new URL(isAdmin ? "/admin/login" : "/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isAdmin && token.role !== "ADMIN") {
    if (isAdminApi) {
      return NextResponse.json({ error: "Admin access required" }, {
        status: 403, headers: { "Cache-Control": "no-store" },
      });
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Student/teacher is now a selectable authenticated mode. A JWT role
  // may be stale immediately after opting into teaching; the destination
  // Server Component checks the current DB entitlement and selected mode.
  // The proxy only rejects unauthenticated requests here.

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/teacher/:path*", "/leaderboard/:path*", "/classes/:path*", "/subjects/:path*", "/exams/:path*", "/attempts/:path*", "/results/:path*", "/theory/:path*", "/documents/:path*", "/notifications/:path*", "/dich-vu/:path*", "/vip/:path*", "/admin/:path*", "/api/admin/:path*", "/uploads/documents/:path*"]
};
