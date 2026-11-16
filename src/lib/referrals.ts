import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { newReferralCode, parseInviteToken } from "@/lib/referral-invites";

export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: userId }, select: { referralCode: true },
  });
  if (!existing) throw new Error("User not found");
  if (existing.referralCode) return existing.referralCode;

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = newReferralCode();
    try {
      const updated = await prisma.user.updateMany({
        where: { id: userId, referralCode: null },
        data: { referralCode: code },
      });
      if (updated.count === 1) return code;
      const won = await prisma.user.findUnique({
        where: { id: userId }, select: { referralCode: true },
      });
      if (won?.referralCode) return won.referralCode;
    } catch (error) {
      // Extremely unlikely public-code collision. Never overwrite another user.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    }
  }
  throw new Error("Could not allocate referral code");
}

export function verifiedInviterFromToken(token: string | undefined, secret = process.env.NEXTAUTH_SECRET) {
  return parseInviteToken(token, secret);
}

export async function findEligibleInviter(inviterId: string | undefined, userId?: string) {
  if (!inviterId || inviterId === userId) return null;
  return prisma.user.findUnique({ where: { id: inviterId }, select: { id: true } });
}

/**
 * OAuth creates the User through NextAuth's Prisma adapter. Attach an inviter
 * only if that user's account was CREATED AFTER the signed invite was issued.
 * Existing accounts can never claim a new inviter through a shared link.
 */
export async function attachReferralToNewGoogleUser(userId: string, token: string | undefined) {
  const invite = verifiedInviterFromToken(token);
  if (!invite || invite.inviterId === userId) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      createdAt: true, referredByUserId: true,
      accounts: { where: { provider: "google" }, select: { id: true }, take: 1 },
    },
  });
  if (!user || user.referredByUserId || !user.accounts.length ||
      user.createdAt.getTime() < invite.issuedAt - 30_000) return false;
  const inviter = await findEligibleInviter(invite.inviterId, userId);
  if (!inviter) return false;
  const result = await prisma.user.updateMany({
    where: { id: userId, referredByUserId: null, createdAt: { gte: new Date(invite.issuedAt - 30_000) } },
    data: { referredByUserId: inviter.id },
  });
  return result.count === 1;
}

export async function getReferralOverview(userId: string) {
  const [code, account, invitedCount, rewardedBuyers, rewardHistory] = await Promise.all([
    getOrCreateReferralCode(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { referralBalanceVnd: true } }),
    prisma.user.count({ where: { referredByUserId: userId } }),
    prisma.referralReward.groupBy({ by: ["buyerId"], where: { inviterId: userId } }),
    prisma.referralReward.findMany({
      where: { inviterId: userId }, orderBy: { createdAt: "desc" }, take: 10,
      select: { id: true, paymentAmountVnd: true, amountVnd: true, createdAt: true },
    }),
  ]);

  return {
    code,
    balanceVnd: account?.referralBalanceVnd ?? 0,
    invitedCount,
    vipBuyersCount: rewardedBuyers.length,
    history: rewardHistory.map(({ id, paymentAmountVnd, amountVnd, createdAt }) => ({
      id, paymentAmountVnd, amountVnd, createdAt: createdAt.toISOString(),
    })),
  };
}
