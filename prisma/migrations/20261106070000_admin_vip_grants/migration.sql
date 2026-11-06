-- Audit every manual VIP grant without falsifying payment status.
CREATE TABLE "AdminVipGrant" (
  "id" TEXT NOT NULL,
  "requestId" VARCHAR(36) NOT NULL,
  "adminId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "days" INTEGER NOT NULL,
  "note" VARCHAR(250) NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminVipGrant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdminVipGrant_requestId_key" ON "AdminVipGrant"("requestId");
CREATE UNIQUE INDEX "AdminVipGrant_subscriptionId_key" ON "AdminVipGrant"("subscriptionId");
CREATE INDEX "AdminVipGrant_userId_createdAt_idx" ON "AdminVipGrant"("userId", "createdAt");
CREATE INDEX "AdminVipGrant_adminId_createdAt_idx" ON "AdminVipGrant"("adminId", "createdAt");
