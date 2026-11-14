-- Additive, no existing education/user data is removed.
CREATE TYPE "SupportConversationStatus" AS ENUM ('AI', 'WAITING_ADMIN', 'RESOLVED');
CREATE TYPE "SupportSender" AS ENUM ('USER', 'AI', 'ADMIN', 'SYSTEM');

CREATE TABLE "SupportConversation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "SupportConversationStatus" NOT NULL DEFAULT 'AI',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportConversation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SupportMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "sender" "SupportSender" NOT NULL,
  "content" TEXT NOT NULL,
  "model" TEXT,
  "inputTokens" INTEGER NOT NULL DEFAULT 0,
  "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "costMicroUsd" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SupportAiBudget" (
  "month" VARCHAR(7) NOT NULL,
  "spentMicroUsd" INTEGER NOT NULL DEFAULT 0,
  "heldMicroUsd" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportAiBudget_pkey" PRIMARY KEY ("month")
);

CREATE INDEX "SupportConversation_userId_updatedAt_idx" ON "SupportConversation"("userId", "updatedAt");
CREATE INDEX "SupportConversation_status_updatedAt_idx" ON "SupportConversation"("status", "updatedAt");
CREATE INDEX "SupportMessage_conversationId_createdAt_idx" ON "SupportMessage"("conversationId", "createdAt");
ALTER TABLE "SupportConversation" ADD CONSTRAINT "SupportConversation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "SupportConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
