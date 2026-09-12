import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { smokeTestEmbeddings } from "../src/lib/embeddings";
import { ensureKnowledgeVectorIndex, getActiveKnowledgeIndex } from "../src/lib/knowledge";

async function main() {
  const slug = process.argv[2] || process.env.DEFAULT_TENANT_SLUG;
  if (!slug) throw new Error("Pass a tenant slug: npm run embeddings:prepare -- <tenant-slug>");
  // Smoke-test first: validate endpoint/model dimensions before creating the
  // environment-specific pgvector index or uploading approved documents.
  const smoke = await smokeTestEmbeddings();
  const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { id: true, slug: true } });
  if (!tenant) throw new Error(`Tenant not found: ${slug}`);
  const { index } = await getActiveKnowledgeIndex(tenant.id);
  await ensureKnowledgeVectorIndex(index);
  console.log(JSON.stringify({ tenant: tenant.slug, index: { id: index.id, ...smoke }, status: "ready" }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
