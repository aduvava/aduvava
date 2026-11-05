-- Optional theory file metadata: retain all existing text lessons.
ALTER TABLE "TheoryLesson"
  ADD COLUMN "fileStoredName" TEXT,
  ADD COLUMN "fileOriginalName" TEXT,
  ADD COLUMN "fileMimeType" TEXT,
  ADD COLUMN "fileSize" INTEGER;

CREATE UNIQUE INDEX "TheoryLesson_fileStoredName_key" ON "TheoryLesson"("fileStoredName");
