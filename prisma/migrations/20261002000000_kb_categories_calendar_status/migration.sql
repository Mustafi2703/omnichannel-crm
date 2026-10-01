-- Knowledge Base client visual categories (CORE / FUNDAMENTAL / PRODUCT / FAQ groups)
ALTER TABLE "KnowledgeDocument" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'general_information';
CREATE INDEX IF NOT EXISTS "KnowledgeDocument_tenantId_category_idx" ON "KnowledgeDocument"("tenantId", "category");

-- Calendar status + comments after creation
ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'scheduled';
ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS "comments" TEXT;
CREATE INDEX IF NOT EXISTS "CalendarEvent_tenantId_status_idx" ON "CalendarEvent"("tenantId", "status");
