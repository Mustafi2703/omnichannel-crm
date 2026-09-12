import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fromApiError, leadInputSchema, paginationSchema } from "@/lib/api";

export async function GET(req: Request) {
  try { const session = await requireSession(); const query = new URL(req.url).searchParams; const { page, pageSize } = paginationSchema.parse(Object.fromEntries(query)); const q = query.get("q") || ""; const where = { tenantId: session.tenantId, OR: q ? [{ title: { contains: q, mode: "insensitive" as const } }, { contact: { displayName: { contains: q, mode: "insensitive" as const } } }] : undefined }; const [leads, total, stages] = await prisma.$transaction([prisma.lead.findMany({ where, include: { contact: true, stage: true, owner: { select: { id: true, name: true } } }, orderBy: { updatedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }), prisma.lead.count({ where }), prisma.pipelineStage.findMany({ where: { tenantId: session.tenantId }, orderBy: { position: "asc" } })]); return NextResponse.json({ leads, stages, pagination: { page, pageSize, total } }); } catch (error) { return fromApiError(error); }
}
export async function POST(req: Request) {
  try { const session = await requireSession(); const input = leadInputSchema.parse(await req.json()); const [contact, stage] = await Promise.all([prisma.contact.findFirst({ where: { id: input.contactId, tenantId: session.tenantId } }), prisma.pipelineStage.findFirst({ where: { id: input.stageId, tenantId: session.tenantId } })]); if (!contact || !stage) return NextResponse.json({ error: { code: "INVALID_RELATION", message: "Contact or stage not found" } }, { status: 400 }); const lead = await prisma.lead.create({ data: { ...input, tenantId: session.tenantId } }); await audit({ tenantId: session.tenantId, actorUserId: session.id, action: "create", entityType: "lead", entityId: lead.id, after: { title: lead.title } }); return NextResponse.json({ lead }, { status: 201 }); } catch (error) { return fromApiError(error); }
}
