import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  COOKIE_NAME, INVITE_LIFETIME_MS, REFERRAL_CODE_PATTERN, createInviteToken,
} from "@/lib/referral-invites";

export const runtime = "nodejs";

// Keep Location relative so the browser stays on educhi.xyz even when Next.js
// receives an internal Docker request URL (e.g. http://0.0.0.0:3000).
function redirectOnSameHost(path: string) {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: path, "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const normalized = code.trim().toUpperCase();

  if (!REFERRAL_CODE_PATTERN.test(normalized) || !process.env.NEXTAUTH_SECRET) {
    return redirectOnSameHost("/register");
  }
  const owner = await prisma.user.findUnique({
    where: { referralCode: normalized }, select: { id: true },
  });
  if (!owner) return redirectOnSameHost("/register");
  const token = createInviteToken(owner.id, process.env.NEXTAUTH_SECRET);
  const response = redirectOnSameHost("/register?ref=" + encodeURIComponent(normalized));
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production" || request.nextUrl.protocol === "https:",
    sameSite: "lax", path: "/", maxAge: INVITE_LIFETIME_MS / 1000,
  });
  return response;
}
