-- One-time, non-destructive repair for production databases that already
-- contain legacy Exam.grade (text) and Exam.contentMode (text: topics/exams).
-- Apply ONLY after a verified full database backup.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '15s';
SET LOCAL statement_timeout = '120s';

-- Match the effects of 20261109001000_exam_grade. Keep already assigned grades.
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "grade" TEXT;
UPDATE "Exam" SET "grade" = CASE
  WHEN "educationLevel" = 'THCS'
    AND "examStructure"->>'grade' IN ('Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9')
    THEN "examStructure"->>'grade'
  WHEN "educationLevel" = 'THPT'
    AND "examStructure"->>'grade' IN ('Lớp 10', 'Lớp 11', 'Lớp 12')
    THEN "examStructure"->>'grade'
  WHEN "educationLevel" = 'EXAM_10' THEN 'Ôn thi vào 10'
  WHEN "educationLevel" = 'THPTQG' THEN 'Ôn thi THPTQG'
  ELSE NULL
END
WHERE "grade" IS NULL AND "specialExamTrack" IS NULL;
CREATE INDEX IF NOT EXISTS "Exam_educationLevel_grade_isPublished_idx"
  ON "Exam" ("educationLevel", "grade", "isPublished");

-- Match the target state of 20261109004500_exam_content_mode without dropping
-- the pre-existing legacy text column and without touching question/attempt data.
DO $repair$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'ExamContentMode' AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE "ExamContentMode" AS ENUM ('TOPIC', 'EXAM');
  END IF;
END
$repair$;
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "contentMode" TEXT;

DO $repair$
DECLARE current_udt TEXT;
BEGIN
  SELECT udt_name INTO current_udt
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'Exam' AND column_name = 'contentMode';

  IF current_udt IN ('text', 'varchar') THEN
    -- Never silently collapse an unfamiliar legacy category.
    IF EXISTS (
      SELECT 1 FROM "Exam"
      WHERE "contentMode" IS NOT NULL
        AND LOWER(BTRIM("contentMode")) NOT IN ('topics', 'topic', 'theory', 'exams', 'exam')
    ) THEN
      RAISE EXCEPTION 'Unrecognized legacy Exam.contentMode values; no conversion performed';
    END IF;

    ALTER TABLE "Exam" ALTER COLUMN "contentMode" DROP DEFAULT;
    UPDATE "Exam"
    SET "contentMode" = CASE
      WHEN LOWER(BTRIM("contentMode")) IN ('exams', 'exam') THEN 'EXAM'
      WHEN LOWER(BTRIM("contentMode")) IN ('topics', 'topic', 'theory') THEN 'TOPIC'
      WHEN "examStructure"->>'contentMode' = 'exams' THEN 'EXAM'
      WHEN "examStructure"->>'contentMode' IN ('topics', 'theory') THEN 'TOPIC'
      WHEN "type" IN ('MOCK', 'PREDICTION') THEN 'EXAM'
      ELSE 'TOPIC'
    END;
    ALTER TABLE "Exam"
      ALTER COLUMN "contentMode" TYPE "ExamContentMode"
      USING "contentMode"::"ExamContentMode";
  ELSIF current_udt <> 'ExamContentMode' THEN
    RAISE EXCEPTION 'Unexpected type for Exam.contentMode: %', current_udt;
  END IF;
END
$repair$;

ALTER TABLE "Exam"
  ALTER COLUMN "contentMode" SET DEFAULT 'TOPIC'::"ExamContentMode",
  ALTER COLUMN "contentMode" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "Exam_contentMode_isPublished_ownerId_idx"
  ON "Exam" ("contentMode", "isPublished", "ownerId");
COMMIT;

SELECT "contentMode"::text AS mode, COUNT(*) AS count
FROM "Exam" GROUP BY 1 ORDER BY 1;
