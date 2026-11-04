ALTER TABLE "Exam" ADD COLUMN "grade" TEXT;
CREATE INDEX "Exam_grade_subjectId_isPublished_idx" ON "Exam"("grade", "subjectId", "isPublished");
