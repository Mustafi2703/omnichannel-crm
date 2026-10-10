import "dotenv/config";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { normaliseOriginList } from "../src/lib/widget-cors";

const tenantSlug = process.argv[2] || process.env.DEFAULT_TENANT_SLUG;
if (!tenantSlug) throw new Error("Usage: tsx scripts/apply-client-settings.ts <tenant-slug>");

const origins = normaliseOriginList([
  "https://www.hidrotekwater.com.tr",
  "https://hidrotekwater.com.tr",
  "https://www.biohidrogen.com",
  "https://biohidrogen.com",
]);

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error(`Tenant not found: ${tenantSlug}`);
  const settings = tenant.settings && typeof tenant.settings === "object" && !Array.isArray(tenant.settings)
    ? { ...(tenant.settings as Record<string, unknown>) }
    : {};
  settings.widgetAllowedOrigins = origins;
  await prisma.tenant.update({ where: { id: tenant.id }, data: { settings: settings as Prisma.InputJsonValue } });
  console.log(`widget-origins\t${tenant.slug}\t${origins.join(",")}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
