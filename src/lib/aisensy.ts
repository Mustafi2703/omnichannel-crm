import { prisma } from "./prisma";

/**
 * AiSensy WhatsApp adapter (LeadGen-class channel).
 * Configure AISENSY_API_KEY + AISENSY_API_URL to go live.
 * Docs: docs/AISENSY_INTEGRATION.md
 */

export type NormalizedInbound = {
  externalMessageId: string;
  from: string;
  text: string;
  contactName?: string;
  timestamp?: string;
};

export function verifyAisensySignature(rawBody: string, signature: string | null) {
  const secret = process.env.AISENSY_WEBHOOK_SECRET;
  if (!secret) return true; // demo mode: accept
  if (!signature) return false;
  // Simple shared-secret header check for demo; replace with HMAC if AiSensy provides it
  return signature === secret || signature === `Bearer ${secret}`;
}

export function parseAisensyWebhook(payload: unknown): NormalizedInbound[] {
  const body = payload as Record<string, unknown>;
  // Support a few common BSP shapes + our demo shape
  if (Array.isArray(body.messages)) {
    return (body.messages as Record<string, unknown>[]).map((m, i) => ({
      externalMessageId: String(m.id || m.messageId || `aisensy-${Date.now()}-${i}`),
      from: String(m.from || m.waId || m.phone || ""),
      text: String(
        (m.text as { body?: string } | undefined)?.body ||
          m.body ||
          m.message ||
          "",
      ),
      contactName: String(m.profileName || m.name || "") || undefined,
    }));
  }
  if (body.from && (body.text || body.message)) {
    return [
      {
        externalMessageId: String(body.id || body.messageId || `aisensy-${Date.now()}`),
        from: String(body.from),
        text: String(body.text || body.message),
        contactName: body.name ? String(body.name) : undefined,
      },
    ];
  }
  return [];
}

export async function sendAisensyText(params: {
  to: string;
  text: string;
}): Promise<{ ok: boolean; externalMessageId?: string; demo?: boolean; error?: string }> {
  const apiKey = process.env.AISENSY_API_KEY;
  const apiUrl = process.env.AISENSY_API_URL; // e.g. https://backend.aisensy.com/campaign/t1/api/v2
  if (!apiKey || !apiUrl) {
    const fakeId = `demo-wa-${Date.now()}`;
    console.info("[AiSensy demo send]", params.to, params.text.slice(0, 80));
    return { ok: true, externalMessageId: fakeId, demo: true };
  }
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: params.to,
        type: "text",
        text: { body: params.text },
      }),
    });
    if (!res.ok) {
      return { ok: false, error: await res.text() };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string; messageId?: string };
    return { ok: true, externalMessageId: data.id || data.messageId || `wa-${Date.now()}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

/**
 * The template endpoint is kept separate because providers commonly require a
 * different payload/URL from free-form session messages. No free-form fallback
 * is permitted when the WhatsApp service window is closed.
 */
export async function sendAisensyTemplate(params: { to: string; name: string; language: string; providerTemplateId?: string | null }): Promise<{ ok: boolean; externalMessageId?: string; demo?: boolean; error?: string }> {
  const apiKey = process.env.AISENSY_API_KEY;
  const apiUrl = process.env.AISENSY_TEMPLATE_API_URL;
  if (!apiKey && !apiUrl) {
    return { ok: true, externalMessageId: `demo-wa-template-${Date.now()}`, demo: true };
  }
  if (!apiKey || !apiUrl) return { ok: false, error: "AISENSY_TEMPLATE_API_URL and AISENSY_API_KEY are required for approved template sends" };
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        to: params.to,
        type: "template",
        template: { name: params.providerTemplateId || params.name, language: { code: params.language } },
      }),
    });
    if (!response.ok) return { ok: false, error: await response.text() };
    const data = (await response.json().catch(() => ({}))) as { id?: string; messageId?: string };
    return { ok: true, externalMessageId: data.id || data.messageId || `wa-template-${Date.now()}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "template send failed" };
  }
}

export function isAisensyTemplateDeliveryConfigured() {
  return Boolean(process.env.AISENSY_API_KEY && process.env.AISENSY_TEMPLATE_API_URL);
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
