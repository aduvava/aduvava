CREATE TABLE "CommunityMessage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "content" VARCHAR(500) NOT NULL,
  "replyToId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CommunityMessage_createdAt_id_idx" ON "CommunityMessage"("createdAt", "id");
CREATE INDEX "CommunityMessage_userId_createdAt_idx" ON "CommunityMessage"("userId", "createdAt");
