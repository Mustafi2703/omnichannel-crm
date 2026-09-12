-- Keep embedding indexes explicitly versioned so staging and production never
-- query across providers or vector dimensions.
CREATE TABLE "KnowledgeIndex" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeIndex_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "KnowledgeDocument" ADD COLUMN "embeddingIndexId" TEXT;
ALTER TABLE "KnowledgeChunk" ADD COLUMN "indexId" TEXT;
ALTER TABLE "KnowledgeChunk" ALTER COLUMN "embedding" TYPE vector USING "embedding"::vector;

-- Preserve existing OpenAI 1536-vector chunks as a clearly labelled legacy
-- index. New environment configuration never selects it unless explicitly set.
INSERT INTO "KnowledgeIndex" ("id", "tenantId", "provider", "model", "dimensions", "version", "isActive", "createdAt", "updatedAt")
SELECT 'legacy-openai-' || "tenantId", "tenantId", 'openai', 'text-embedding-3-small', 1536, 'legacy-v1', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "KnowledgeChunk"
GROUP BY "tenantId"
ON CONFLICT ("id") DO NOTHING;

UPDATE "KnowledgeChunk"
SET "indexId" = 'legacy-openai-' || "tenantId"
WHERE "indexId" IS NULL;

UPDATE "KnowledgeDocument" AS document
SET "embeddingIndexId" = 'legacy-openai-' || document."tenantId"
WHERE document."embeddingIndexId" IS NULL
  AND EXISTS (
    SELECT 1 FROM "KnowledgeChunk" AS chunk
    WHERE chunk."documentId" = document."id"
  );

ALTER TABLE "KnowledgeChunk" ALTER COLUMN "indexId" SET NOT NULL;

CREATE UNIQUE INDEX "KnowledgeIndex_tenantId_provider_model_dimensions_version_key"
  ON "KnowledgeIndex"("tenantId", "provider", "model", "dimensions", "version");
CREATE INDEX "KnowledgeIndex_tenantId_isActive_idx" ON "KnowledgeIndex"("tenantId", "isActive");
CREATE INDEX "KnowledgeDocument_tenantId_embeddingIndexId_idx" ON "KnowledgeDocument"("tenantId", "embeddingIndexId");
CREATE INDEX "KnowledgeChunk_tenantId_indexId_documentId_idx" ON "KnowledgeChunk"("tenantId", "indexId", "documentId");

ALTER TABLE "KnowledgeIndex" ADD CONSTRAINT "KnowledgeIndex_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_embeddingIndexId_fkey"
  FOREIGN KEY ("embeddingIndexId") REFERENCES "KnowledgeIndex"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_indexId_fkey"
  FOREIGN KEY ("indexId") REFERENCES "KnowledgeIndex"("id") ON DELETE CASCADE ON UPDATE CASCADE;
