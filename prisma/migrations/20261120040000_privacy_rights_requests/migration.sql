-- Keep existing anonymous support messages intact while introducing an
-- authenticated, owner-linked compliance request workflow and internal review state.
ALTER TABLE "LeadMessage" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'OPEN';
ALTER TABLE "LeadMessage" ADD COLUMN "userId" TEXT;
ALTER TABLE "LeadMessage" ADD COLUMN "adminNote" TEXT;
ALTER TABLE "LeadMessage" ADD COLUMN "processedAt" TIMESTAMP(3);

CREATE INDEX "LeadMessage_userId_createdAt_idx" ON "LeadMessage"("userId", "createdAt");
CREATE INDEX "LeadMessage_status_createdAt_idx" ON "LeadMessage"("status", "createdAt");
CREATE INDEX "LeadMessage_source_createdAt_idx" ON "LeadMessage"("source", "createdAt");

ALTER TABLE "LeadMessage" ADD CONSTRAINT "LeadMessage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
