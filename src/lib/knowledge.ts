import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { Prisma, type KnowledgeIndex } from "@prisma/client";
import { createEmbeddings, getEmbeddingConfiguration } from "./embeddings";
import { prisma } from "./prisma";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const CHUNK_SIZE = 1_200;
const CHUNK_OVERLAP = 180;

export type KnowledgeSource = { documentId: string; title: string; content: string; score: number };

export function canManageKnowledge(role: string) { return role === "OWNER" || role === "ADMIN"; }

export async function extractKnowledgeText(file: File) {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("File must be 10 MB or smaller");
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try { return (await parser.getText()).text; } finally { await parser.destroy(); }
  }
  if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx")) return (await mammoth.extractRawText({ buffer })).value;
  if (file.type.startsWith("text/") || /\.(txt|md|csv)$/i.test(name)) return buffer.toString("utf8");
  throw new Error("Supported formats are PDF, DOCX, TXT, Markdown, and CSV");
}

export function cleanKnowledgeText(content: string) { return content.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim(); }

export function chunkKnowledgeText(content: string) {
  const text = cleanKnowledgeText(content);
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    let end = Math.min(cursor + CHUNK_SIZE, text.length);
    if (end < text.length) {
      const boundary = Math.max(text.lastIndexOf("\n", end), text.lastIndexOf(". ", end));
      if (boundary > cursor + CHUNK_SIZE / 2) end = boundary + 1;
    }
    const chunk = text.slice(cursor, end).trim();
    if (chunk) chunks.push(chunk);
    cursor = end >= text.length ? text.length : Math.max(end - CHUNK_OVERLAP, cursor + 1);
  }
  return chunks;
}

function vectorLiteral(embedding: number[], dimensions: number) {
  if (embedding.length !== dimensions || embedding.some((value) => !Number.isFinite(value))) throw new Error("Invalid embedding returned by provider");
  return `[${embedding.join(",")}]`;
}

/** The configured provider/model/version is the complete retrieval identity. */
export async function getActiveKnowledgeIndex(tenantId: string) {
  const config = getEmbeddingConfiguration();
  if (!config) throw new Error("EMBEDDING_PROVIDER is required to index or retrieve knowledge");
  const index = await prisma.knowledgeIndex.upsert({
    where: { tenantId_provider_model_dimensions_version: { tenantId, provider: config.provider, model: config.model, dimensions: config.dimensions, version: config.indexVersion } },
    create: { tenantId, provider: config.provider, model: config.model, dimensions: config.dimensions, version: config.indexVersion, isActive: true },
    update: { isActive: true },
  });
  await prisma.knowledgeIndex.updateMany({ where: { tenantId, id: { not: index.id }, isActive: true }, data: { isActive: false } });
  return { config, index };
}

function indexName(index: KnowledgeIndex) {
  if (!/^[a-zA-Z0-9_-]+$/.test(index.id) || !Number.isInteger(index.dimensions)) throw new Error("Invalid knowledge index identity");
  return `KnowledgeChunk_embedding_${index.id}`.slice(0, 60);
}

/**
 * Creates a separate ANN index for one provider/model/dimension/version.
 * halfvec supports HNSW indexes up to 4,000 dimensions, unlike vector's
 * 2,000-dimensional HNSW limit; Nemotron's native output is 2,048.
 */
export async function ensureKnowledgeVectorIndex(index: KnowledgeIndex) {
  const name = indexName(index).replace(/"/g, "");
  const indexId = index.id.replace(/'/g, "''");
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "${name}" ON "KnowledgeChunk" USING hnsw (("embedding"::halfvec(${index.dimensions})) halfvec_cosine_ops) WHERE "indexId" = '${indexId}'`,
  );
}

export async function ingestKnowledgeDocument(documentId: string, tenantId: string) {
  await prisma.knowledgeDocument.updateMany({ where: { id: documentId, tenantId }, data: { status: "processing", errorMessage: null } });
  try {
    const document = await prisma.knowledgeDocument.findFirst({ where: { id: documentId, tenantId } });
    if (!document) throw new Error("Knowledge document not found");
    const chunks = chunkKnowledgeText(document.content);
    if (!chunks.length) throw new Error("No readable text was found in this document");

    const { config, index } = await getActiveKnowledgeIndex(tenantId);
    const embeddings: number[][] = [];
    for (let start = 0; start < chunks.length; start += 50) embeddings.push(...(await createEmbeddings(config, chunks.slice(start, start + 50), "passage")));
    // The successful provider call above verifies actual dimensions before the
    // pgvector ANN index is created or updated.
    await ensureKnowledgeVectorIndex(index);

    await prisma.$transaction(async (tx) => {
      await tx.knowledgeChunk.deleteMany({ where: { documentId: document.id } });
      for (const [position, content] of chunks.entries()) {
        await tx.$executeRaw(
          Prisma.sql`INSERT INTO "KnowledgeChunk" ("id", "tenantId", "documentId", "indexId", "content", "tokenCount", "metadata", "embedding")
            VALUES (${crypto.randomUUID()}, ${tenantId}, ${document.id}, ${index.id}, ${content}, ${Math.ceil(content.length / 4)}, ${JSON.stringify({ position, indexVersion: index.version })}::jsonb, ${vectorLiteral(embeddings[position], index.dimensions)}::vector)`,
        );
      }
      await tx.knowledgeDocument.update({ where: { id: document.id }, data: { status: "ready", errorMessage: null, embeddingModel: `${config.provider}/${config.model}`, embeddingIndexId: index.id } });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Knowledge indexing failed";
    await prisma.knowledgeDocument.updateMany({ where: { id: documentId, tenantId }, data: { status: "failed", errorMessage: message.slice(0, 500) } });
    throw error;
  }
}

export async function retrieveKnowledge(params: { tenantId: string; query: string; limit?: number }) {
  if (!params.query.trim()) return [] as KnowledgeSource[];
  const { config, index } = await getActiveKnowledgeIndex(params.tenantId);
  const [embedding] = await createEmbeddings(config, [params.query], "query");
  const vector = vectorLiteral(embedding, index.dimensions);
  const halfvec = Prisma.raw(`halfvec(${index.dimensions})`);
  const rows = await prisma.$queryRaw<KnowledgeSource[]>(
    Prisma.sql`SELECT chunk."documentId", document."title", chunk."content", 1 - (chunk."embedding"::${halfvec} <=> ${vector}::${halfvec}) AS "score"
      FROM "KnowledgeChunk" AS chunk JOIN "KnowledgeDocument" AS document ON document."id" = chunk."documentId"
      WHERE chunk."tenantId" = ${params.tenantId} AND chunk."indexId" = ${index.id} AND document."embeddingIndexId" = ${index.id} AND document."status" = 'ready'
      ORDER BY chunk."embedding"::${halfvec} <=> ${vector}::${halfvec} LIMIT ${Math.min(Math.max(params.limit || 5, 1), 8)}`,
  );
  return rows.filter((row) => row.score >= 0.25);
}
