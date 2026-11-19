/**
 * Review intervals are deliberately deterministic and independent of paid AI.
 * Three successive fully correct reviews mark an item as mastered.
 */
export function nextReviewState(previousStreak: number, correct: boolean, at = new Date()) {
  const streak = correct ? Math.max(0, previousStreak) + 1 : 0;
  const minutes = correct ? (streak === 1 ? 24 * 60 : streak === 2 ? 3 * 24 * 60 : 7 * 24 * 60) : 10;
  return {
    correctStreak: streak,
    nextReviewAt: new Date(at.getTime() + minutes * 60_000),
    masteredAt: correct && streak >= 3 ? at : null,
  };
}
