import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fromApiError } from "@/lib/api";
import { encryptConfig } from "@/lib/encryption";
const inputSchema = z.object({ provider: z.string().trim().min(1).max(60), config: z.record(z.string(), z.string().max(4000)), isActive: z.boolean().default(true) });
export async function GET() { try { const session = await requireRole("OWNER"); const integrations = await prisma.integrationConnection.findMany({ where: { tenantId: session.tenantId }, select: { id: true, provider: true, isActive: true, updatedAt: true } }); return NextResponse.json({ integrations }); } catch (error) { return fromApiError(error); } }
export async function PUT(req: Request) { try { const session = await requireRole("OWNER"); const input = inputSchema.parse(await req.json()); const integration = await prisma.integrationConnection.upsert({ where: { tenantId_provider: { tenantId: session.tenantId, provider: input.provider } }, create: { tenantId: session.tenantId, provider: input.provider, encryptedConfig: encryptConfig(input.config), isActive: input.isActive }, update: { encryptedConfig: encryptConfig(input.config), isActive: input.isActive } }); await audit({ tenantId: session.tenantId, actorUserId: session.id, action: "upsert", entityType: "integration", entityId: integration.id, after: { provider: integration.provider, isActive: integration.isActive } }); return NextResponse.json({ integration: { id: integration.id, provider: integration.provider, isActive: integration.isActive } }); } catch (error) { return fromApiError(error); } }
