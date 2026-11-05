-- Existing personal exams were unintentionally published with PUBLIC sharing.
-- Revoke public link access while preserving ownership and explicit email grants.
UPDATE "Exam"
SET "shareMode" = 'RESTRICTED'
WHERE "ownerId" IS NOT NULL AND "shareMode" = 'PUBLIC';

-- Defense in depth: a missing shareMode must never silently become PUBLIC.
ALTER TABLE "Exam"
ALTER COLUMN "shareMode" SET DEFAULT 'RESTRICTED';
