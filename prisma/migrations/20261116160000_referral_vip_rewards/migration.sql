-- Additive migration: preserve existing accounts, VIP subscriptions and bank payments.
ALTER TABLE "User"
  ADD COLUMN "referralCode" VARCHAR(16),
  ADD COLUMN "referredByUserId" TEXT,
  ADD COLUMN "referralBalanceVnd" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
CREATE INDEX "User_referredByUserId_idx" ON "User"("referredByUserId");
ALTER TABLE "User" ADD CONSTRAINT "User_referredByUserId_fkey"
  FOREIGN KEY ("referredByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ReferralReward" (
  "id" TEXT NOT NULL,
  "inviterId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "paymentAmountVnd" INTEGER NOT NULL,
  "amountVnd" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralReward_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReferralReward_positive_amount_check" CHECK ("amountVnd" > 0 AND "paymentAmountVnd" >= "amountVnd")
);

CREATE UNIQUE INDEX "ReferralReward_paymentId_key" ON "ReferralReward"("paymentId");
CREATE INDEX "ReferralReward_inviterId_createdAt_idx" ON "ReferralReward"("inviterId", "createdAt");
CREATE INDEX "ReferralReward_buyerId_idx" ON "ReferralReward"("buyerId");

ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_inviterId_fkey"
  FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Any reward or balance mutation must be performed inside the VIP settlement transaction.
ALTER TABLE "User" ADD CONSTRAINT "User_referralBalanceVnd_nonnegative"
  CHECK ("referralBalanceVnd" >= 0);
