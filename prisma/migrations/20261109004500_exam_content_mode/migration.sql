-- Non-destructive classification of system and personal exams.
-- Existing records are mapped using original Admin classification metadata first,
-- then existing ExamType, so published exam links/answers/attempts are untouched.
CREATE TYPE "ExamContentMode" AS ENUM ('TOPIC', 'EXAM');

ALTER TABLE "Exam"
  ADD COLUMN "contentMode" "ExamContentMode" NOT NULL DEFAULT 'TOPIC';

UPDATE "Exam"
SET "contentMode" = CASE
  WHEN "examStructure"->>'contentMode' = 'exams' THEN 'EXAM'::"ExamContentMode"
  WHEN "examStructure"->>'contentMode' IN ('topics', 'theory') THEN 'TOPIC'::"ExamContentMode"
  WHEN "type" IN ('MOCK', 'PREDICTION') THEN 'EXAM'::"ExamContentMode"
  ELSE 'TOPIC'::"ExamContentMode"
END;

CREATE INDEX "Exam_contentMode_isPublished_ownerId_idx"
  ON "Exam" ("contentMode", "isPublished", "ownerId");
