-- Preserve private-exam ownership when accounts are deleted.
-- Previously SetNull silently turned an owned exam into a system exam.
-- Quarantine orphaned legacy user exams before enforcing the new FK.
UPDATE "Exam"
SET "isPublished" = FALSE
WHERE "ownerId" IS NULL AND "code" LIKE 'USER-%' AND "isPublished" = TRUE;

ALTER TABLE "Exam" DROP CONSTRAINT "Exam_ownerId_fkey";
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
