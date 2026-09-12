ALTER TABLE "Conversation"
  ADD COLUMN "assignedAt" TIMESTAMP(3),
  ADD COLUMN "unassignedAt" TIMESTAMP(3),
  ADD COLUMN "lastCallAt" TIMESTAMP(3),
  ADD COLUMN "unassignedEscalatedAt" TIMESTAMP(3),
  ADD COLUMN "firstCallEscalatedAt" TIMESTAMP(3),
  ADD COLUMN "threeHourEscalatedAt" TIMESTAMP(3);

CREATE INDEX "Conversation_tenantId_unassignedAt_idx"
  ON "Conversation"("tenantId", "unassignedAt");

CREATE INDEX "Conversation_tenantId_assignedAt_idx"
  ON "Conversation"("tenantId", "assignedAt");
