import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { generateBotReply, logAiUsage } from "@/lib/ai";
import { sendAisensyTemplate, sendAisensyText, logWhatsappUsage } from "@/lib/aisensy";
import { z } from "zod";
import { fromApiError, idSchema } from "@/lib/api";
import { notify } from "@/lib/notifications";
import { runAutomations } from "@/lib/automation";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const id = idSchema.parse((await ctx.params).id);
    const conversation = await prisma.conversation.findFirst({
      where: { id, tenantId: session.tenantId },
      include: {
        contact: { include: { leads: { include: { stage: true }, take: 3, orderBy: { updatedAt: "desc" } }, tasks: { where: { status: "open" }, take: 5, orderBy: { dueAt: "asc" } } } },
        messages: { orderBy: { createdAt: "asc" } },
        assignee: { select: { id: true, name: true } },
        attachments: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const lastInbound = [...conversation.messages].reverse().find((message) => message.direction === "inbound");
    const whatsappWindowOpen = conversation.channelType !== "whatsapp" || Boolean(lastInbound && lastInbound.createdAt.getTime() > Date.now() - 24 * 60 * 60 * 1000);
    return NextResponse.json({ conversation: { ...conversation, whatsappWindowOpen, lastInboundAt: lastInbound?.createdAt || null } });
  } catch (error) {
    return fromApiError(error);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const id = idSchema.parse((await ctx.params).id);
    const body = z.object({ text: z.string().trim().max(10_000).optional(), templateId: idSchema.optional(), asBot: z.boolean().optional(), triggerAi: z.boolean().optional() }).refine((value) => Boolean(value.text || value.templateId), { message: "A message or approved template is required" }).parse(await req.json());
    const text = body.text;
    const asBot = Boolean(body.asBot);
    if (!text && !body.templateId) return NextResponse.json({ error: "Empty" }, { status: 400 });

    const conversation = await prisma.conversation.findFirst({
      where: { id, tenantId: session.tenantId },
      include: { contact: true, messages: { orderBy: { createdAt: "asc" }, take: 20 } },
    });
    if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let replyText = text || "";
    let senderType: "agent" | "bot" = "agent";
    let aiMeta = null as object | null;
    let approvedTemplate: { id: string; name: string; language: string; providerTemplateId: string | null; body: string } | null = null;

    if (body.templateId) {
      approvedTemplate = await prisma.whatsappTemplate.findFirst({ where: { id: body.templateId, tenantId: session.tenantId, status: "approved" }, select: { id: true, name: true, language: true, providerTemplateId: true, body: true } });
      if (!approvedTemplate) return NextResponse.json({ error: { code: "TEMPLATE_NOT_APPROVED", message: "Select an approved WhatsApp template" } }, { status: 400 });
      replyText = approvedTemplate.body;
      aiMeta = { templateId: approvedTemplate.id, templateName: approvedTemplate.name };
    }

    if (asBot || (conversation.aiMode === "auto" && body.triggerAi)) {
      const locale = (conversation.contact.city || "").match(/[İIıi]/) ? "tr" : "tr";
      const history = conversation.messages.map((m) => ({
        role: (m.direction === "inbound" ? "user" : "assistant") as "user" | "assistant",
        content: m.bodyText,
      }));
      const ai = await generateBotReply({
        tenantId: session.tenantId,
        contactName: conversation.contact.displayName,
        channelType: conversation.channelType,
        history: [...history, { role: "user", content: text || "" }],
        locale,
      });
      replyText = ai.reply;
      senderType = "bot";
      aiMeta = {
        model: ai.usedModel,
        handoff: ai.handoff,
        latencyMs: ai.latencyMs,
        sources: (ai.sources || []).map((source) => ({
          documentId: source.documentId,
          title: source.title,
          score: source.score,
        })),
      };
      await logAiUsage({
        tenantId: session.tenantId,
        tokensIn: ai.tokensIn,
        tokensOut: ai.tokensOut,
        model: ai.usedModel,
      });
      if (ai.handoff) {
        await prisma.conversation.update({
          where: { id },
          data: { aiMode: "off", handoffAt: new Date(), unassignedAt: new Date(), status: "pending" },
        });
      }
    }

    let externalMessageId: string | undefined;
    let deliveryStatus = "sent";
    let deliveryError: string | undefined;
    if (conversation.channelType === "whatsapp" && senderType === "agent") {
      const lastInbound = [...conversation.messages].reverse().find((message) => message.direction === "inbound");
      const windowOpen = Boolean(lastInbound && lastInbound.createdAt.getTime() > Date.now() - 24 * 60 * 60 * 1000);
      if (!windowOpen && !approvedTemplate) return NextResponse.json({ error: { code: "WHATSAPP_TEMPLATE_REQUIRED", message: "The 24-hour WhatsApp service window has ended. Select an approved template to contact this customer." } }, { status: 409 });
      const send = approvedTemplate
        ? await sendAisensyTemplate({ to: conversation.contact.phone || "", name: approvedTemplate.name, language: approvedTemplate.language, providerTemplateId: approvedTemplate.providerTemplateId })
        : await sendAisensyText({ to: conversation.contact.phone || "", text: replyText });
      externalMessageId = send.externalMessageId;
      if (send.ok) await logWhatsappUsage(session.tenantId, 1);
      else {
        deliveryStatus = "failed";
        deliveryError = send.error || "WhatsApp delivery failed";
      }
    }

    const message = await prisma.message.create({
      data: {
        tenantId: session.tenantId,
        conversationId: id,
        direction: "outbound",
        senderType,
        senderUserId: senderType === "agent" ? session.id : null,
        bodyText: replyText,
        externalMessageId,
        aiMeta: aiMeta || undefined,
        deliveryStatus,
        deliveryError,
      },
    });
    await prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });
    return NextResponse.json({ message });
  } catch (error) {
    return fromApiError(error);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const id = idSchema.parse((await ctx.params).id);
    const body = z.object({ aiMode: z.enum(["auto", "suggest", "off"]).optional(), status: z.enum(["open", "pending", "closed"]).optional(), assigneeId: z.string().min(1).max(64).nullable().optional(), handoff: z.boolean().optional(), automationPaused: z.boolean().optional() }).parse(await req.json());
    const assigneeId = body.assigneeId === "me" ? session.id : body.assigneeId;
    if (assigneeId) {
      const assignee = await prisma.user.findFirst({ where: { id: assigneeId, tenantId: session.tenantId, isActive: true } });
      if (!assignee) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Assignee is not an active workspace user" } }, { status: 400 });
    }
    const current = await prisma.conversation.findFirst({ where: { id, tenantId: session.tenantId }, include: { contact: { select: { automationPausedAt: true } } } });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const assignmentChanged = body.assigneeId !== undefined && assigneeId !== current.assigneeId;
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.conversation.update({
        where: { id },
        data: {
          ...(body.aiMode ? { aiMode: body.aiMode } : {}),
          ...(body.status ? { status: body.status } : {}),
          ...(body.assigneeId !== undefined ? { assigneeId } : {}),
          ...(assignmentChanged && assigneeId ? { assignedAt: now, unassignedAt: null, lastCallAt: null, unassignedEscalatedAt: null, firstCallEscalatedAt: null, threeHourEscalatedAt: null } : {}),
          ...(assignmentChanged && !assigneeId ? { assignedAt: null, unassignedAt: now, lastCallAt: null, unassignedEscalatedAt: null, firstCallEscalatedAt: null, threeHourEscalatedAt: null } : {}),
          ...(body.handoff ? { aiMode: "off", handoffAt: now, unassignedAt: now, status: "pending", assigneeId: null, assignedAt: null, lastCallAt: null, unassignedEscalatedAt: null, firstCallEscalatedAt: null, threeHourEscalatedAt: null } : {}),
        },
      });
      if (assignmentChanged) {
        await tx.contact.update({ where: { id: current.contactId }, data: { ownerUserId: assigneeId || null } });
        await tx.lead.updateMany({
          where: { tenantId: session.tenantId, contactId: current.contactId, stage: { is: { isLost: false, isWon: false } } },
          data: { ownerUserId: assigneeId || null },
        });
      }
    });
    if (assigneeId && assigneeId !== session.id) await notify({ tenantId: session.tenantId, userId: assigneeId, type: "conversation_assigned", title: "New conversation assigned", body: `Conversation ${id} was assigned to you.` });
    if (body.automationPaused !== undefined) await prisma.contact.update({ where: { id: current.contactId }, data: { automationPausedAt: body.automationPaused ? new Date() : null } });
    if (body.assigneeId === null) await runAutomations(session.tenantId, "conversation_unassigned", { conversationId: id, contactId: current.contactId });
    if (body.status !== undefined || body.assigneeId !== undefined || body.automationPaused !== undefined || body.handoff) await audit({ tenantId: session.tenantId, actorUserId: session.id, action: "conversation_updated", entityType: "conversation", entityId: id, before: { status: current.status, assigneeId: current.assigneeId, automationPaused: Boolean(current.contact.automationPausedAt) }, after: { status: body.status ?? current.status, assigneeId: body.assigneeId === undefined ? current.assigneeId : assigneeId, automationPaused: body.automationPaused ?? Boolean(current.contact.automationPausedAt), handoff: Boolean(body.handoff) } });
    return NextResponse.json({ ok: true, count: 1 });
  } catch (error) {
    return fromApiError(error);
  }
}
