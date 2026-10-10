ALTER TABLE "User"
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "passwordChangedAt" TIMESTAMP(3);

ALTER TABLE "Contact"
  ADD COLUMN "blockedAt" TIMESTAMP(3);

-- The 15-minute clock starts when the AI hands the chat to an adviser, not when the chat is created.
UPDATE "Conversation"
SET "unassignedAt" = NULL
WHERE "aiMode" = 'auto'
  AND "assigneeId" IS NULL
  AND "unassignedAt" IS NOT NULL;

-- Contacts already sitting in Kara Liste stay blocked.
UPDATE "Contact" AS c
SET "blockedAt" = NOW()
WHERE c."blockedAt" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "Lead" AS l
    JOIN "PipelineStage" AS s ON s.id = l."stageId"
    WHERE l."contactId" = c.id
      AND l."tenantId" = c."tenantId"
      AND s.key = 'blacklist'
  );
