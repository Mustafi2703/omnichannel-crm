import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fromApiError, idSchema, leadInputSchema } from "@/lib/api";

type Context = { params: Promise<{ id: string }> };
const updateSchema = leadInputSchema.partial().omit({ contactId: true }).extend({ stageId: idSchema.optional() });
export async function GET(_req: Request, ctx: Context) { try { const session = await requireSession(); const id = idSchema.parse((await ctx.params).id); const lead = await prisma.lead.findFirst({ where: { id, tenantId: session.tenantId }, include: { contact: true, stage: true, owner: { select: { id: true, name: true } }, tasks: true } }); return lead ? NextResponse.json({ lead }) : NextResponse.json({ error: { code: "NOT_FOUND", message: "Lead not found" } }, { status: 404 }); } catch (error) { return fromApiError(error); } }
export async function PATCH(req: Request, ctx: Context) {
  try { const session = await requireSession(); const id = idSchema.parse((await ctx.params).id); const input = updateSchema.parse(await req.json()); const before = await prisma.lead.findFirst({ where: { id, tenantId: session.tenantId } }); if (!before) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Lead not found" } }, { status: 404 }); if (input.stageId) { const stage = await prisma.pipelineStage.findFirst({ where: { id: input.stageId, tenantId: session.tenantId } }); if (!stage) return NextResponse.json({ error: { code: "INVALID_STAGE", message: "Stage not found" } }, { status: 400 }); if (stage.isLost && !input.lostReason && !before.lostReason) return NextResponse.json({ error: { code: "LOST_REASON_REQUIRED", message: "A lost reason is required for this stage" } }, { status: 400 }); if (stage.isWon && input.wonAmount === undefined && before.wonAmount == null) return NextResponse.json({ error: { code: "WON_AMOUNT_REQUIRED", message: "A won amount is required for this stage" } }, { status: 400 }); }
    const lead = await prisma.lead.update({ where: { id }, data: input });
    const stage = input.stageId ? await prisma.pipelineStage.findFirst({ where: { id: input.stageId, tenantId: session.tenantId }, select: { key: true } }) : null;
    if (stage?.key === "negative" || stage?.key === "blacklist") {
      await prisma.$transaction([
        prisma.contact.update({ where: { id: lead.contactId }, data: { automationPausedAt: new Date() } }),
        prisma.conversation.updateMany({ where: { tenantId: session.tenantId, contactId: lead.contactId }, data: { aiMode: "off", status: "closed" } }),
        prisma.task.updateMany({ where: { tenantId: session.tenantId, contactId: lead.contactId, status: "open" }, data: { status: "cancelled" } }),
      ]);
    }
    await audit({ tenantId: session.tenantId, actorUserId: session.id, action: "update", entityType: "lead", entityId: id, before: { stageId: before.stageId, score: before.score }, after: { stageId: lead.stageId, score: lead.score, automationPaused: stage?.key === "negative" || stage?.key === "blacklist" } }); return NextResponse.json({ lead });
  } catch (error) { return fromApiError(error); }
}
export async function DELETE(_req: Request, ctx: Context) { try { const session = await requireSession(); const id = idSchema.parse((await ctx.params).id); const lead = await prisma.lead.deleteMany({ where: { id, tenantId: session.tenantId } }); if (!lead.count) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Lead not found" } }, { status: 404 }); await audit({ tenantId: session.tenantId, actorUserId: session.id, action: "delete", entityType: "lead", entityId: id }); return NextResponse.json({ ok: true }); } catch (error) { return fromApiError(error); } }
