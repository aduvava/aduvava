import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateReferralCode } from "@/lib/referrals";
import { REFERRAL_CODE_PATTERN, LEGACY_REFERRAL_CODE_PATTERN } from "@/lib/referral-invites";

export const runtime = "nodejs";

// Relative Location prevents private Docker hostnames from leaking to visitors.
function sameHostRedirect(path: string) {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: path, "Cache-Control": "no-store" },
  });
}

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const normalized = code.trim().toUpperCase();
  const current = REFERRAL_CODE_PATTERN.test(normalized);
  const legacy = LEGACY_REFERRAL_CODE_PATTERN.test(normalized);
  if (!current && !legacy) return sameHostRedirect("/vip");

  const inviter = current
    ? await prisma.user.findUnique({ where: { referralCode: normalized }, select: { id: true } })
    : await prisma.user.findUnique({ where: { referralLegacyCode: normalized }, select: { id: true } });
  if (!inviter) return sameHostRedirect("/vip");

  // Older long invitation URLs still resolve, but buyers are never required to
  // register new accounts or leave their existing Educhi/Admin session.
  const codeForCheckout = await getOrCreateReferralCode(inviter.id);
  return sameHostRedirect("/vip?ref=" + encodeURIComponent(codeForCheckout));
}
