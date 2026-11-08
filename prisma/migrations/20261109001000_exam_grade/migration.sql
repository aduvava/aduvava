-- Store the exact class for each exam, without moving/deleting questions or attempts.
ALTER TABLE "Exam" ADD COLUMN "grade" TEXT;

-- Preserve historical class selections made in the standalone Admin, when valid.
UPDATE "Exam"
SET "grade" = CASE
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
WHERE "specialExamTrack" IS NULL;

CREATE INDEX "Exam_educationLevel_grade_isPublished_idx"
  ON "Exam" ("educationLevel", "grade", "isPublished");
