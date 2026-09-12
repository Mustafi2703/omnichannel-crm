import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { fromApiError, idSchema } from "@/lib/api";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const id = idSchema.parse((await ctx.params).id);
    const conversation = await prisma.conversation.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!conversation) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Conversation not found" } }, { status: 404 });
    if (!conversation.assigneeId) return NextResponse.json({ error: { code: "UNASSIGNED", message: "Assign the conversation before logging a call" } }, { status: 409 });
    const calledAt = new Date();
    await prisma.conversation.update({
      where: { id },
      data: { lastCallAt: calledAt },
    });
    await audit({ tenantId: session.tenantId, actorUserId: session.id, action: "call_logged", entityType: "conversation", entityId: id, after: { calledAt } });
    return NextResponse.json({ ok: true, calledAt });
  } catch (error) {
    return fromApiError(error);
  }
}
