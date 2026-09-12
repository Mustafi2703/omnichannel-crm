import "dotenv/config";
import { readFile } from "node:fs/promises";
import { cleanKnowledgeText, ingestKnowledgeDocument } from "../src/lib/knowledge";
import { prisma } from "../src/lib/prisma";

async function main() {
  const [tenantSlug, sourcePath, title, replaceDocumentId] = process.argv.slice(2);
  if (!tenantSlug || !sourcePath || !title) {
    throw new Error("Usage: tsx scripts/ingest-client-knowledge.ts <tenant-slug> <source-path> <title> [replace-document-id]");
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug }, select: { id: true, slug: true } });
  if (!tenant) throw new Error(`Tenant not found: ${tenantSlug}`);

  const content = cleanKnowledgeText(await readFile(sourcePath, "utf8"));
  if (!content) throw new Error("Knowledge source is empty");

  const existing = replaceDocumentId
    ? await prisma.knowledgeDocument.findFirst({ where: { id: replaceDocumentId, tenantId: tenant.id }, select: { id: true } })
    : null;
  if (replaceDocumentId && !existing) throw new Error("Replacement knowledge document was not found for this tenant");

  const document = existing
    ? await prisma.knowledgeDocument.update({
      where: { id: existing.id },
      data: { title: title.slice(0, 200), content, sourceFilename: sourcePath.split("/").pop(), mimeType: "text/markdown", status: "processing", errorMessage: null },
    })
    : await prisma.knowledgeDocument.create({
      data: { tenantId: tenant.id, title: title.slice(0, 200), content, sourceFilename: sourcePath.split("/").pop(), mimeType: "text/markdown", status: "processing" },
    });

  await ingestKnowledgeDocument(document.id, tenant.id);
  const indexed = await prisma.knowledgeDocument.findFirst({
    where: { id: document.id, tenantId: tenant.id },
    include: { _count: { select: { chunks: true } }, embeddingIndex: { select: { provider: true, model: true, dimensions: true, version: true } } },
  });
  console.log(JSON.stringify({ tenant: tenant.slug, document: { id: indexed?.id, title: indexed?.title, status: indexed?.status, chunks: indexed?._count.chunks, index: indexed?.embeddingIndex } }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
