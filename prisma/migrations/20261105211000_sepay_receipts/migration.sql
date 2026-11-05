-- Keep a unique, durable record for each bank webhook that activated VIP.
CREATE TABLE "SePayReceipt" (
  "eventId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SePayReceipt_pkey" PRIMARY KEY ("eventId")
);
CREATE UNIQUE INDEX "SePayReceipt_paymentId_key" ON "SePayReceipt"("paymentId");
