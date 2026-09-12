ALTER TABLE "Task" ADD COLUMN "dueNotifiedAt" TIMESTAMP(3);

CREATE INDEX "Task_status_dueNotifiedAt_dueAt_idx"
  ON "Task"("status", "dueNotifiedAt", "dueAt");

CREATE INDEX "Notification_tenantId_userId_createdAt_idx"
  ON "Notification"("tenantId", "userId", "createdAt" DESC);
