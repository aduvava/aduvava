-- Atomic, persistent abuse-prevention buckets; only HMAC identifiers are stored.
CREATE TABLE "SecurityThrottle" (
    "key" VARCHAR(100) NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SecurityThrottle_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "SecurityThrottle_expiresAt_idx" ON "SecurityThrottle"("expiresAt");
