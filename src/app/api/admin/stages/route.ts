import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fromApiError } from "@/lib/api";
const stageSchema = z.object({ key: z.string().trim().regex(/^[a-z0-9_]+$/).max(50), name: z.string().trim().min(1).max(80), nameTr: z.string().trim().min(1).max(80), position: z.number().int().min(0).max(100), isWon: z.boolean().default(false), isLost: z.boolean().default(false) }).refine((v) => !(v.isWon && v.isLost), "A stage cannot be both won and lost");
export async function GET() { try { const session = await requireRole("OWNER", "ADMIN"); const stages = await prisma.pipelineStage.findMany({ where: { tenantId: session.tenantId }, orderBy: { position: "asc" } }); return NextResponse.json({ stages }); } catch (error) { return fromApiError(error); } }
export async function POST(req: Request) { try { const session = await requireRole("OWNER", "ADMIN"); const input = stageSchema.parse(await req.json()); const stage = await prisma.pipelineStage.create({ data: { ...input, tenantId: session.tenantId } }); await audit({ tenantId: session.tenantId, actorUserId: session.id, action: "create", entityType: "pipeline_stage", entityId: stage.id, after: { key: stage.key } }); return NextResponse.json({ stage }, { status: 201 }); } catch (error) { return fromApiError(error); } }
