ALTER TABLE "CampaignRecipient"
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "nextAttemptAt" TIMESTAMP(3),
  ADD COLUMN "sendingAt" TIMESTAMP(3);

DROP INDEX IF EXISTS "CampaignRecipient_tenantId_status_idx";
CREATE INDEX "CampaignRecipient_tenantId_status_nextAttemptAt_idx"
  ON "CampaignRecipient"("tenantId", "status", "nextAttemptAt");
