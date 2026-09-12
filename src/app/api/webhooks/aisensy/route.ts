import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyAisensySignature,
  parseAisensyWebhook,
  sendAisensyText,
  logWhatsappUsage,
} from "@/lib/aisensy";
import { generateBotReply, logAiUsage } from "@/lib/ai";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limit = await rateLimit(`aisensy:${clientIp(req)}`, 120);
  if (!limit.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  const raw = await req.text();
  const signature =
    req.headers.get("x-aisensy-signature") ||
    req.headers.get("authorization");
  if (!verifyAisensySignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tenantSlug =
    (payload as { tenantSlug?: string }).tenantSlug ||
    process.env.DEFAULT_TENANT_SLUG ||
    "demo-sirket";
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) return NextResponse.json({ error: "Tenant missing" }, { status: 404 });

  const inbound = parseAisensyWebhook(payload);
  const results = [];

  for (const msg of inbound) {
    if (!msg.from || !msg.text) continue;

    const existing = await prisma.message.findFirst({
      where: { tenantId: tenant.id, externalMessageId: msg.externalMessageId },
    });
    if (existing) {
      results.push({ deduped: true, id: existing.id });
      continue;
    }

    const identity = await prisma.contactIdentity.findUnique({
      where: {
        tenantId_type_value: {
          tenantId: tenant.id,
          type: "whatsapp_id",
          value: msg.from,
        },
      },
      include: { contact: true },
    });

    let contact = identity?.contact;
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          tenantId: tenant.id,
          displayName: msg.contactName || msg.from,
          phone: msg.from,
          source: "whatsapp",
          consentWhatsappMarketing: false,
          identities: {
            create: [
              { tenantId: tenant.id, type: "whatsapp_id", value: msg.from },
              { tenantId: tenant.id, type: "phone", value: msg.from },
            ],
          },
        },
      });
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        tenantId: tenant.id,
        contactId: contact.id,
        channelType: "whatsapp",
        status: { in: ["open", "pending"] },
      },
    });
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          tenantId: tenant.id,
          contactId: contact.id,
          channelType: "whatsapp",
          aiMode: "auto",
          externalThreadId: msg.from,
        },
      });
    }

    await prisma.message.create({
      data: {
        tenantId: tenant.id,
        conversationId: conversation.id,
        direction: "inbound",
        senderType: "contact",
        bodyText: msg.text,
        externalMessageId: msg.externalMessageId,
      },
    });

    if (conversation.aiMode === "auto") {
      const history = await prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "asc" },
        take: 12,
      });
      const ai = await generateBotReply({
        tenantId: tenant.id,
        contactName: contact.displayName,
        channelType: "whatsapp",
        locale: "tr",
        history: history.map((m) => ({
          role: m.direction === "inbound" ? "user" : "assistant",
          content: m.bodyText,
        })),
      });
      await logAiUsage({
        tenantId: tenant.id,
        tokensIn: ai.tokensIn,
        tokensOut: ai.tokensOut,
        model: ai.usedModel,
      });

      const send = await sendAisensyText({ to: msg.from, text: ai.reply });
      if (send.ok) await logWhatsappUsage(tenant.id, 1);

      await prisma.message.create({
        data: {
          tenantId: tenant.id,
          conversationId: conversation.id,
          direction: "outbound",
          senderType: "bot",
          bodyText: ai.reply,
          externalMessageId: send.externalMessageId,
          aiMeta: { model: ai.usedModel, handoff: ai.handoff, demo: send.demo },
          deliveryStatus: send.ok ? "sent" : "failed",
          deliveryError: send.ok ? undefined : send.error || "WhatsApp delivery failed",
        },
      });

      if (ai.handoff) {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { aiMode: "off", handoffAt: new Date(), status: "pending" },
        });
      }
    }

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });
    results.push({ ok: true, conversationId: conversation.id });
  }

  return NextResponse.json({ processed: results.length, results });
}
