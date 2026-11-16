-- Retain any previously distributed 12-character links as aliases.
-- Existing monetary balances, commissions, users and bank payments stay intact.
ALTER TABLE "User" ADD COLUMN "referralLegacyCode" VARCHAR(16);
CREATE UNIQUE INDEX "User_referralLegacyCode_key" ON "User"("referralLegacyCode");

UPDATE "User"
SET "referralLegacyCode" = "referralCode", "referralCode" = NULL
WHERE "referralCode" IS NOT NULL AND "referralCode" !~ '^[A-Z0-9]{6}$';

ALTER TABLE "User" ALTER COLUMN "referralCode" TYPE VARCHAR(6);
ALTER TABLE "User" ADD CONSTRAINT "User_referralCode_six_char_check"
  CHECK ("referralCode" IS NULL OR "referralCode" ~ '^[A-Z0-9]{6}$');
