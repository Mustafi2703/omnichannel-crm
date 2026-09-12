import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fromApiError, idSchema } from "@/lib/api";

type Context = { params: Promise<{ id: string }> };
export async function POST(req: Request, ctx: Context) {
  try {
    const session = await requireRole("OWNER", "ADMIN");
    const sourceId = idSchema.parse((await ctx.params).id);
    const targetId = idSchema.parse(z.object({ targetId: idSchema }).parse(await req.json()).targetId);
    if (sourceId === targetId) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Choose two different contacts" } }, { status: 400 });
    const [source, target] = await Promise.all([prisma.contact.findFirst({ where: { id: sourceId, tenantId: session.tenantId } }), prisma.contact.findFirst({ where: { id: targetId, tenantId: session.tenantId } })]);
    if (!source || !target) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Contact not found" } }, { status: 404 });
    await prisma.$transaction(async (tx) => {
      const identities = await tx.contactIdentity.findMany({ where: { contactId: sourceId } });
      for (const identity of identities) await tx.contactIdentity.upsert({ where: { tenantId_type_value: { tenantId: session.tenantId, type: identity.type, value: identity.value } }, create: { tenantId: session.tenantId, contactId: targetId, type: identity.type, value: identity.value }, update: { contactId: targetId } });
      await tx.lead.updateMany({ where: { contactId: sourceId }, data: { contactId: targetId } });
      await tx.conversation.updateMany({ where: { contactId: sourceId }, data: { contactId: targetId } });
      await tx.task.updateMany({ where: { contactId: sourceId }, data: { contactId: targetId } });
      await tx.contact.delete({ where: { id: sourceId } });
    });
    await audit({ tenantId: session.tenantId, actorUserId: session.id, action: "merge", entityType: "contact", entityId: targetId, before: { sourceId }, after: { targetId } });
    return NextResponse.json({ ok: true, contactId: targetId });
  } catch (error) { return fromApiError(error); }
}
