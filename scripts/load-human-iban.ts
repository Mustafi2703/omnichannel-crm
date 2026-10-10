import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";

const file = process.argv[3] || "scripts/iban.local.json";
const tenantSlug = process.argv[2] || process.env.DEFAULT_TENANT_SLUG;
if (!tenantSlug) throw new Error("Usage: tsx scripts/load-human-iban.ts <tenant-slug> [iban-json]");

type Details = { bank?: string; accountName?: string; iban?: string };
const details = JSON.parse(readFileSync(file, "utf8")) as Details;
const bank = details.bank?.trim();
const accountName = details.accountName?.trim();
const iban = details.iban?.replace(/\s+/g, "").trim();
if (!bank || !accountName || !iban || iban.length < 15) throw new Error("IBAN file must include bank, accountName, and iban");

const content = [
  "Human agents only. Do not send this document to the assistant.",
  `BANKA: ${bank}`,
  `UNVAN: ${accountName}`,
  `IBAN: ${iban}`,
].join("\n");

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug }, select: { id: true, slug: true } });
  if (!tenant) throw new Error(`Tenant not found: ${tenantSlug}`);
  const existing = await prisma.knowledgeDocument.findFirst({
    where: { tenantId: tenant.id, category: "iban_information" },
    select: { id: true },
  });
  const document = existing
    ? await prisma.knowledgeDocument.update({
        where: { id: existing.id },
        data: {
          title: "IBAN Information",
          content,
          category: "iban_information",
          status: "ready",
          errorMessage: null,
          embeddingModel: null,
          embeddingIndexId: null,
        },
      })
    : await prisma.knowledgeDocument.create({
        data: {
          tenantId: tenant.id,
          title: "IBAN Information",
          content,
          category: "iban_information",
          mimeType: "text/plain",
          status: "ready",
        },
      });
  await prisma.knowledgeChunk.deleteMany({ where: { documentId: document.id } });
  console.log(`iban-ready\t${tenant.slug}\t${document.id}\tnot-indexed`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
