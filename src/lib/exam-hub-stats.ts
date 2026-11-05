type ScoredAttempt = { score: number; maxScore: number };

export function getCompletionRate(submitted: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.min(total, Math.max(0, submitted)) / total) * 100);
}

export function getAverageScore(attempts: readonly ScoredAttempt[]): number {
  if (!attempts.length) return 0;
  const ratios = attempts.reduce(
    (sum, attempt) => sum + (attempt.maxScore > 0 ? attempt.score / attempt.maxScore : 0),
    0,
  );
  return Math.round((ratios / attempts.length) * 100) / 10;
}
