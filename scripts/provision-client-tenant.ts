import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getOperationsSettings, mergeOperationsSettings } from "../src/lib/tenant-settings";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const required = ["CLIENT_TENANT_NAME", "CLIENT_TENANT_SLUG", "CLIENT_OWNER_EMAIL", "CLIENT_OWNER_NAME", "CLIENT_OWNER_PASSWORD"] as const;
for (const key of required) if (!process.env[key]) throw new Error(`${key} is required`);
if ((process.env.CLIENT_OWNER_PASSWORD || "").length < 16) throw new Error("CLIENT_OWNER_PASSWORD must be at least 16 characters");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const stages = [
  ["new_lead", "New lead", "Yeni Lead"],
  ["unassigned", "Unassigned", "Atanmamış"],
  ["assigned", "Assigned", "Atanmış"],
  ["unreachable", "Unreachable", "Ulaşılamadı"],
  ["cold_follow_up", "Cold follow-up", "Soğuk Takip"],
  ["warm_follow_up", "Warm follow-up", "Ilık Takip"],
  ["hot_follow_up", "Hot follow-up", "Sıcak Takip"],
  ["sale", "Sale", "Satış"],
  ["negative", "Negative", "Olumsuz"],
  ["blacklist", "Blacklist", "Kara Liste"],
] as const;

async function main() {
  const slug = process.env.CLIENT_TENANT_SLUG as string;
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) throw new Error(`Tenant ${slug} already exists; refusing to overwrite it`);

  const tenant = await prisma.tenant.create({
    data: {
      name: process.env.CLIENT_TENANT_NAME as string,
      slug,
      timezone: "Europe/Istanbul",
      localeDefault: "tr",
      settings: mergeOperationsSettings({ brandName: process.env.CLIENT_TENANT_NAME }, getOperationsSettings({})),
    },
  });
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: process.env.CLIENT_OWNER_NAME as string,
      email: (process.env.CLIENT_OWNER_EMAIL as string).toLowerCase(),
      passwordHash: await bcrypt.hash(process.env.CLIENT_OWNER_PASSWORD as string, 12),
      role: Role.OWNER,
    },
  });
  await prisma.pipelineStage.createMany({
    data: stages.map(([key, name, nameTr], index) => ({
      tenantId: tenant.id,
      key,
      name,
      nameTr,
      position: index + 1,
      isWon: key === "sale",
      isLost: key === "negative" || key === "blacklist",
    })),
  });
  console.log(`Provisioned ${tenant.name} (${tenant.slug}) with ${stages.length} pipeline stages.`);
}

main().finally(() => prisma.$disconnect());
