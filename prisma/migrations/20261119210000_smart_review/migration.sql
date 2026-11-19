-- A separate, user-scoped review record for each question answered incorrectly.
CREATE TABLE "ReviewItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "wrongCount" INTEGER NOT NULL DEFAULT 1,
  "reviewCount" INTEGER NOT NULL DEFAULT 0,
  "correctStreak" INTEGER NOT NULL DEFAULT 0,
  "nextReviewAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastWrongAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastReviewedAt" TIMESTAMP(3),
  "masteredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReviewItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReviewItem_userId_questionId_key" ON "ReviewItem"("userId", "questionId");
CREATE INDEX "ReviewItem_userId_nextReviewAt_idx" ON "ReviewItem"("userId", "nextReviewAt");
CREATE INDEX "ReviewItem_userId_masteredAt_idx" ON "ReviewItem"("userId", "masteredAt");
ALTER TABLE "ReviewItem" ADD CONSTRAINT "ReviewItem_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewItem" ADD CONSTRAINT "ReviewItem_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill already-submitted incorrect answers without modifying past attempts.
-- Deterministic ids prevent duplicates if this statement is ever retried.
INSERT INTO "ReviewItem"
  ("id", "userId", "questionId", "wrongCount", "reviewCount", "correctStreak",
   "nextReviewAt", "lastWrongAt", "createdAt", "updatedAt")
SELECT
  md5('review:' || a."userId" || ':' || ans."questionId"),
  a."userId",
  ans."questionId",
  COUNT(*)::INTEGER,
  0,
  0,
  CURRENT_TIMESTAMP,
  MAX(COALESCE(a."submittedAt", a."updatedAt")),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "AttemptAnswer" AS ans
JOIN "Attempt" AS a ON a."id" = ans."attemptId"
WHERE a."status" = 'SUBMITTED'
  AND ans."isCorrect" = FALSE
GROUP BY a."userId", ans."questionId"
ON CONFLICT ("userId", "questionId") DO NOTHING;
