import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  COOKIE_NAME, INVITE_LIFETIME_MS, REFERRAL_CODE_PATTERN, createInviteToken,
} from "@/lib/referral-invites";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const normalized = code.trim().toUpperCase();
  const redirect = new URL("/register", request.url);
  if (!REFERRAL_CODE_PATTERN.test(normalized) || !process.env.NEXTAUTH_SECRET) {
    return NextResponse.redirect(redirect);
  }
  const owner = await prisma.user.findUnique({
    where: { referralCode: normalized }, select: { id: true },
  });
  if (!owner) return NextResponse.redirect(redirect);
  const token = createInviteToken(owner.id, process.env.NEXTAUTH_SECRET);
  redirect.searchParams.set("ref", normalized);
  const response = NextResponse.redirect(redirect);
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true, secure: request.nextUrl.protocol === "https:",
    sameSite: "lax", path: "/", maxAge: INVITE_LIFETIME_MS / 1000,
  });
  return response;
}
