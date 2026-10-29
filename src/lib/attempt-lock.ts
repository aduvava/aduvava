import { Prisma, type Attempt } from "@prisma/client";
import { HttpError } from "@/lib/api";

// Every write to a running attempt locks the same PostgreSQL row.
export async function lockAttempt(
  tx: Prisma.TransactionClient,
  id: string,
  userId: string,
): Promise<Attempt> {
  const rows = await tx.$queryRawUnsafe<{ id: string }[]>(
    'SELECT "id" FROM "Attempt" WHERE "id" = $1 AND "userId" = $2 FOR UPDATE',
    id,
    userId,
  );
  if (rows.length === 0) throw new HttpError(404, "Attempt not found");
  return tx.attempt.findUniqueOrThrow({ where: { id } });
}

export function deadlineOf(attempt: Pick<Attempt, "startedAt" | "extraSeconds">, durationMinutes: number) {
  return attempt.startedAt.getTime() + (durationMinutes * 60 + attempt.extraSeconds) * 1000;
}

export function isAttemptExpired(
  attempt: Pick<Attempt, "startedAt" | "extraSeconds">,
  durationMinutes: number,
  now = Date.now(),
) {
  return now > deadlineOf(attempt, durationMinutes) + 5000;
}
