import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

type AccessDb = Pick<Prisma.TransactionClient, "subscription" | "user" | "examAccessGrant" | "studyGroupExam">;

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

/** The USER- prefix is reserved for personal exams. A legacy orphan must never
 * be treated as an unrestricted system exam just because its owner was deleted.
 */
export function isOrphanedPersonalExam(exam: { ownerId?: string | null; code?: string }) {
  return !exam.ownerId && exam.code?.startsWith("USER-") === true;
}

export async function canAccessExam(userId: string, exam: { accessLevel: "FREE" | "PRO"; code: string }, db: AccessDb = prisma) {
  if (isOrphanedPersonalExam(exam as { ownerId?: string | null; code: string })) return false;
  if (exam.accessLevel !== "FREE") {
    const active = await hasActiveSubscription(userId, db);
    if (!active) return false;
  }

  const sharedExam = exam as {
    id?: string;
    code?: string;
    ownerId?: string | null;
    shareMode?: "PUBLIC" | "PASSWORD" | "RESTRICTED";
  };

  if (!sharedExam.ownerId) return true;
  if (sharedExam.ownerId === userId) return true;
  if (sharedExam.shareMode === "PUBLIC") return true;
  if (!sharedExam.id) return false;

  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, emailVerified: true } });
  const grant = await db.examAccessGrant.findFirst({
    where: {
      examId: sharedExam.id,
      OR: [
        { userId },
        ...(user?.email && user.emailVerified ? [{ userId: null, email: user.email.toLowerCase() }] : []),
      ],
    },
  });

  if (grant) return true;

  // Group access is derived from CURRENT membership, never a lasting grant.
  // Leaving a group or removing an exam immediately revokes future access.
  const groupShare = await db.studyGroupExam.findFirst({
    where: {
      examId: sharedExam.id,
      group: { members: { some: { userId } } },
    },
    select: { examId: true },
  });
  return Boolean(groupShare);
}

export async function canAccessTheory(userId: string, accessLevel: "FREE" | "PRO") {
  if (accessLevel === "FREE") return true;
  return hasActiveSubscription(userId);
}
