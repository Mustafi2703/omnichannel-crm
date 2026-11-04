import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "./prisma";
import type { SendResult } from "./inbound";

/**
 * AiSensy WhatsApp adapter on AiSensy's Project API (PRO plan).
 * Go live with AISENSY_PROJECT_ID + AISENSY_PROJECT_API_PWD (from a Custom App)
 * and AISENSY_WEBHOOK_SECRET (the webhook's shared secret).
 * Docs: docs/AISENSY_INTEGRATION.md
 */

export type NormalizedInbound = {
  externalMessageId: string;
  from: string;
  text: string;
  contactName?: string;
};

const API_BASE = "https://apis.aisensy.com/project-apis/v1/project";

const hmac = (secret: string, body: string) => createHmac("sha256", secret).update(body).digest("hex");

/** X-AiSensy-Signature is the hex HMAC-SHA256 of the request body, keyed with the webhook's shared secret. */
export function verifyAisensySignature(rawBody: string, signature: string | null) {
  const secret = process.env.AISENSY_WEBHOOK_SECRET;
  // Fail closed: WhatsApp injection is blocked until a webhook secret is configured.
  if (!secret || !signature) return false;
  const received = Buffer.from(signature.trim().toLowerCase());
  const matches = (body: string) => {
    const expected = Buffer.from(hmac(secret, body));
    return expected.length === received.length && timingSafeEqual(expected, received);
  };
  if (matches(rawBody)) return true;
  // AiSensy's own Node sample signs JSON.stringify(body), so accept the re-serialised form too.
  try {
    return matches(JSON.stringify(JSON.parse(rawBody)));
  } catch {
    return false;
  }
}

type AisensyMessage = {
  id?: string;
  messageId?: string;
  phone_number?: string;
  message_type?: string;
  message_content?: { text?: string; title?: string; caption?: string; url?: string };
  user_name?: string;
  userName?: string;
};

/** Project webhook notification `{ id, topic, data: { message } }`; only "message.sender.user" is a customer message. */
export function parseAisensyNotification(payload: unknown): NormalizedInbound | null {
  const notification = payload as { id?: string; topic?: string; data?: { message?: AisensyMessage } } | null;
  const message = notification?.data?.message;
  const externalMessageId = message?.messageId || message?.id || notification?.id;
  if (notification?.topic !== "message.sender.user" || !message?.phone_number || !externalMessageId) return null;
  const content = message.message_content || {};
  // Text, button and list replies carry words; media without a caption is shown as its type and link.
  const text = (content.text || content.title || content.caption || "").trim()
    || `[${message.message_type || "MESSAGE"}]${content.url ? ` ${content.url}` : ""}`;
  return {
    externalMessageId: String(externalMessageId),
    from: message.phone_number.replace(/\D/g, ""),
    text,
    contactName: message.user_name || message.userName || undefined,
  };
}

export function isAisensyConfigured() {
  return Boolean(process.env.AISENSY_PROJECT_ID && process.env.AISENSY_PROJECT_API_PWD);
}

async function sendAisensyMessage(to: string, body: Record<string, unknown>): Promise<SendResult> {
  if (!isAisensyConfigured()) {
    console.info("[AiSensy demo send]", to, JSON.stringify(body).slice(0, 80));
    return { ok: true, externalMessageId: `demo-wa-${Date.now()}`, demo: true };
  }
  try {
    const res = await fetch(`${API_BASE}/${process.env.AISENSY_PROJECT_ID}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-AiSensy-Project-API-Pwd": process.env.AISENSY_PROJECT_API_PWD!,
      },
      body: JSON.stringify({ to: to.replace(/\D/g, ""), recipient_type: "individual", ...body }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { ok: false, error: await res.text() };
    const data = (await res.json().catch(() => ({}))) as { messages?: { id?: string }[] };
    return { ok: true, externalMessageId: data.messages?.[0]?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

/** Free-form text; WhatsApp only accepts it inside the 24-hour service window. */
export function sendAisensyText(params: { to: string; text: string }) {
  return sendAisensyMessage(params.to, { type: "text", text: { body: params.text } });
}

/** An approved template, by its Meta template name. Required outside the 24-hour window. */
export function sendAisensyTemplate(params: { to: string; name: string; language: string; providerTemplateId?: string | null }) {
  return sendAisensyMessage(params.to, {
    type: "template",
    template: { name: params.providerTemplateId || params.name, language: { code: params.language } },
  });
}

export async function logWhatsappUsage(
  tenantId: string,
  outboundCount = 1,
  details?: { eventType?: string; meta?: Record<string, string | number | boolean | null> },
) {
  const card = await prisma.rateCard.findUnique({ where: { tenantId } });
  const unit = card?.whatsappMsg ?? 0.005;
  await prisma.usageEvent.create({
    data: {
      tenantId,
      category: "whatsapp",
      eventType: details?.eventType || "outbound",
      quantity: outboundCount,
      unitCost: unit,
      totalCost: Number((unit * outboundCount).toFixed(4)),
      meta: details?.meta,
    },
  });
}
