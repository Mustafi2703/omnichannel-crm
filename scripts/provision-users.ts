import "dotenv/config";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { getOperationsSettings, mergeOperationsSettings } from "../src/lib/tenant-settings";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const file = process.argv[2];
if (!file) throw new Error("Usage: tsx scripts/provision-users.ts scripts/provision-users.local.json");

type Row = { name: string; email: string; role: "ADMIN" | "AGENT"; slaManager?: boolean };
const input = JSON.parse(readFileSync(file, "utf8")) as { tenantSlug?: string; users?: Row[] };
if (!input.tenantSlug || !input.users?.length) throw new Error("JSON must include tenantSlug and users");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function temporaryPassword() {
  return randomBytes(18).toString("base64url");
}

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: input.tenantSlug } });
  if (!tenant) throw new Error(`Tenant ${input.tenantSlug} was not found`);
  const created: string[] = [];
  for (const row of input.users || []) {
    const email = row.email?.trim().toLowerCase();
    if (!email || !email.includes("@") || email.includes("replace")) {
      throw new Error(`Set a real email for ${row.name} before running this script`);
    }
    const role = row.role === "ADMIN" ? Role.ADMIN : Role.AGENT;
    const existing = await prisma.user.findFirst({ where: { tenantId: tenant.id, email } });
    if (existing) {
      console.log(`exists\t${email}\t${existing.role}`);
      if (row.slaManager) await assignSlaManager(tenant.id, tenant.settings, existing.id);
      continue;
    }
    const password = temporaryPassword();
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: row.name.trim(),
        email,
        role,
        passwordHash: await bcrypt.hash(password, 12),
        mustChangePassword: true,
      },
    });
    if (row.slaManager) await assignSlaManager(tenant.id, tenant.settings, user.id);
    created.push(`${row.name}\t${email}\t${role}\t${password}`);
  }
  if (!created.length) {
    console.log("No new accounts. Existing users were left unchanged.");
    return;
  }
  console.log("Give each password to that person only. It is not stored again.");
  for (const line of created) console.log(line);
}

async function assignSlaManager(tenantId: string, settings: unknown, userId: string) {
  const operations = getOperationsSettings(settings);
  operations.sla.managerUserIds = [userId];
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { settings: mergeOperationsSettings(settings, operations) },
  });
  console.log(`sla-manager\t${userId}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
