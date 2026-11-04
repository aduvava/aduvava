ALTER TABLE "Exam" ADD COLUMN "contentMode" TEXT NOT NULL DEFAULT 'exams', ADD COLUMN "chapterId" TEXT;
UPDATE "Exam" SET "contentMode" = CASE
  WHEN "examStructure"->>'contentMode' IN ('topics', 'theory') THEN 'topics'
  WHEN "examStructure"->>'contentMode' = 'exams' THEN 'exams'
  WHEN "type" = 'PRACTICE' THEN 'topics' ELSE 'exams' END;
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_contentMode_check" CHECK ("contentMode" IN ('topics', 'exams'));
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "TheoryChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Exam_chapterId_contentMode_idx" ON "Exam"("chapterId", "contentMode");
