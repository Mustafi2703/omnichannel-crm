import type { LeadSource } from "@prisma/client";
import { prisma } from "./prisma";
import { generateBotReply, logAiUsage } from "./ai";

export type SendResult = { ok: boolean; externalMessageId?: string; demo?: boolean; error?: string };

/**
 * Saves a customer's message from an outside channel (WhatsApp, Messenger, Instagram, comments):
 * skips blocked contacts and redeliveries, then finds or creates the contact and its open conversation.
 * The contact is keyed by `${channelType}_id` = the sender's id on that channel (whatsapp_id for WhatsApp).
 */
export async function storeInboundMessage(m: {
  tenantId: string;
  channelType: string;
  from: string;
  text: string;
  externalMessageId: string;
  source: LeadSource;
  contactName?: string;
  phone?: string;
  aiMode?: "auto" | "off";
}) {
  const identityType = `${m.channelType}_id`;
  const blocked = await prisma.contact.findFirst({
    where: {
      tenantId: m.tenantId,
      blockedAt: { not: null },
      OR: [
        { identities: { some: { type: identityType, value: m.from } } },
        ...(m.phone ? [{ phone: m.phone }, { identities: { some: { type: "phone", value: m.phone } } }] : []),
      ],
    },
    select: { id: true },
  });
  if (blocked) return { status: "blocked" as const };

  const existing = await prisma.message.findFirst({ where: { tenantId: m.tenantId, externalMessageId: m.externalMessageId } });
  if (existing) return { status: "duplicate" as const };

  const identity = await prisma.contactIdentity.findUnique({
    where: { tenantId_type_value: { tenantId: m.tenantId, type: identityType, value: m.from } },
    include: { contact: true },
  });
  const contact =
    identity?.contact ||
    (await prisma.contact.create({
      data: {
        tenantId: m.tenantId,
        displayName: m.contactName || m.from,
        phone: m.phone,
        source: m.source,
        consentWhatsappMarketing: false,
        identities: {
          create: [
            { tenantId: m.tenantId, type: identityType, value: m.from },
            ...(m.phone ? [{ tenantId: m.tenantId, type: "phone", value: m.phone }] : []),
          ],
        },
      },
    }));

  const conversation =
    (await prisma.conversation.findFirst({
      where: { tenantId: m.tenantId, contactId: contact.id, channelType: m.channelType, status: { in: ["open", "pending"] } },
    })) ||
    (await prisma.conversation.create({
      data: { tenantId: m.tenantId, contactId: contact.id, channelType: m.channelType, aiMode: m.aiMode || "auto", externalThreadId: m.from },
    }));

  await prisma.message.create({
    data: {
      tenantId: m.tenantId,
      conversationId: conversation.id,
      direction: "inbound",
      senderType: "contact",
      bodyText: m.text,
      externalMessageId: m.externalMessageId,
    },
  });
  await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });
  return { status: "stored" as const, contact, conversation };
}

/** Runs the assistant on the conversation, sends its answer through the channel and hands off when it asks to. */
export async function replyWithAssistant(params: {
  tenantId: string;
  conversation: { id: string; channelType: string; assigneeId: string | null; unassignedAt: Date | null };
  contactName: string;
  send: (text: string) => Promise<SendResult>;
}) {
  const { conversation } = params;
  const history = (
    await prisma.message.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: "desc" }, take: 12 })
  ).reverse();
  const ai = await generateBotReply({
    tenantId: params.tenantId,
    contactName: params.contactName,
    channelType: conversation.channelType,
    locale: "tr",
    history: history.map((m) => ({ role: m.direction === "inbound" ? "user" : "assistant", content: m.bodyText })),
  });
  await logAiUsage({ tenantId: params.tenantId, tokensIn: ai.tokensIn, tokensOut: ai.tokensOut, model: ai.usedModel });

  const send = await params.send(ai.reply);
  await prisma.message.create({
    data: {
      tenantId: params.tenantId,
      conversationId: conversation.id,
      direction: "outbound",
      senderType: "bot",
      bodyText: ai.reply,
      externalMessageId: send.externalMessageId,
      aiMeta: { model: ai.usedModel, handoff: ai.handoff, demo: send.demo },
      deliveryStatus: send.ok ? "sent" : "failed",
      deliveryError: send.ok ? undefined : send.error || `${conversation.channelType} delivery failed`,
    },
  });

  if (ai.handoff) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        aiMode: "off",
        handoffAt: new Date(),
        status: "pending",
        unassignedAt: conversation.assigneeId ? conversation.unassignedAt : new Date(),
      },
    });
  }
}
