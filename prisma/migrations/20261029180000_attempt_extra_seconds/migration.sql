-- Server-authoritative extra time for purchased helpers.
ALTER TABLE "Attempt" ADD COLUMN "extraSeconds" INTEGER NOT NULL DEFAULT 0;
