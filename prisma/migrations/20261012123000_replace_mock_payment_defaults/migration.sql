ALTER TABLE "Payment"
ALTER COLUMN "provider" SET DEFAULT 'manual-bank-transfer';

ALTER TABLE "CoinTopup"
ALTER COLUMN "provider" SET DEFAULT 'manual-bank-transfer';
