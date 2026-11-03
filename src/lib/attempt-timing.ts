// A student's browser clock is never authoritative for exam time limits.
// Paid extra-time items must be recorded in PostgreSQL, not only React state.
export const MAX_EXTRA_TIME_SECONDS = 3600;

export type TimedAttempt = {
  startedAt: Date;
  extraTimeSeconds: number;
  exam: { durationMinutes: number };
};

export function attemptDeadlineMs(attempt: TimedAttempt): number {
  const extra = Number.isFinite(attempt.extraTimeSeconds)
    ? Math.min(MAX_EXTRA_TIME_SECONDS, Math.max(0, attempt.extraTimeSeconds))
    : 0;
  return attempt.startedAt.getTime() + attempt.exam.durationMinutes * 60_000 + extra * 1000;
}

export function isAttemptExpired(attempt: TimedAttempt, now: Date = new Date()): boolean {
  return now.getTime() >= attemptDeadlineMs(attempt);
}

export function remainingAttemptSeconds(attempt: TimedAttempt, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((attemptDeadlineMs(attempt) - now.getTime()) / 1000));
}

export function helperExtraTimeSeconds(metadata: unknown): number {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return 300;
  const minutes = (metadata as Record<string, unknown>).minutes;
  if (typeof minutes !== "number" || !Number.isFinite(minutes)) return 300;
  return Math.min(20 * 60, Math.max(60, Math.floor(minutes * 60)));
}
