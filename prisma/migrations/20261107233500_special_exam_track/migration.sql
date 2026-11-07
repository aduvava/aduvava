-- A separate optional classification for special assessment exams.
-- Existing exams remain unchanged and continue to use the original subject
-- and education-level filters until explicitly assigned by an administrator.
ALTER TABLE "Exam" ADD COLUMN "specialExamTrack" TEXT;

ALTER TABLE "Exam"
  ADD CONSTRAINT "Exam_specialExamTrack_valid"
  CHECK ("specialExamTrack" IS NULL OR "specialExamTrack" IN (
    'HSA', 'TSA', 'V_ACT', 'QDA', 'BQA', 'DGNL_BCA'
  ));

CREATE INDEX "Exam_specialExamTrack_isPublished_ownerId_idx"
  ON "Exam" ("specialExamTrack", "isPublished", "ownerId");
