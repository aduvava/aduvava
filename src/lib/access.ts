import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

type AccessDb = Pick<Prisma.TransactionClient, "subscription" | "user" | "examAccessGrant">;

export async function hasActiveSubscription(userId: string, db: AccessDb = prisma) {
  const count = await db.subscription.count({
    where: {
      userId,
      status: "ACTIVE",
      startsAt: { lte: new Date() },
      endsAt: { gte: new Date() }
    }
  });

  return count > 0;
}

export async function canAccessExam(userId: string, exam: { accessLevel: "FREE" | "PRO" }, db: AccessDb = prisma) {
  if (exam.accessLevel !== "FREE") {
    const active = await hasActiveSubscription(userId, db);
    if (!active) return false;
  }

  const sharedExam = exam as {
    id?: string;
    ownerId?: string | null;
    shareMode?: "PUBLIC" | "PASSWORD" | "RESTRICTED";
  };

  if (!sharedExam.ownerId) return true;
  if (sharedExam.ownerId === userId) return true;
  if (sharedExam.shareMode === "PUBLIC") return true;
  if (!sharedExam.id) return false;

  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  const grant = await db.examAccessGrant.findFirst({
    where: {
      examId: sharedExam.id,
      OR: [
        { userId },
        ...(user?.email ? [{ email: user.email }] : []),
      ],
    },
  });

  return Boolean(grant);
}

export async function canAccessTheory(userId: string, accessLevel: "FREE" | "PRO") {
  if (accessLevel === "FREE") return true;
  return hasActiveSubscription(userId);
}
