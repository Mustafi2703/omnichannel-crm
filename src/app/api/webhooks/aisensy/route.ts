import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyAisensySignature,
  parseAisensyNotification,
  sendAisensyText,
  logWhatsappUsage,
} from "@/lib/aisensy";
import { replyWithAssistant, storeInboundMessage } from "@/lib/inbound";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// AiSensy marks a notification failed unless it gets a 2xx within 5 s and then delivers it again,
// so the customer's message is stored before responding and the assistant replies afterwards.
export async function POST(req: Request) {
  const limit = await rateLimit(`aisensy:${clientIp(req)}`, 120);
  if (!limit.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  const raw = await req.text();
  if (!verifyAisensySignature(raw, req.headers.get("x-aisensy-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const msg = parseAisensyNotification(payload);
  // Other topics (status updates, messages sent by the business) are acknowledged and ignored.
  if (!msg) return NextResponse.json({ ignored: true });

  const tenantSlug = process.env.DEFAULT_TENANT_SLUG || "demo-sirket";
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) return NextResponse.json({ error: "Tenant missing" }, { status: 404 });

  const stored = await storeInboundMessage({
    tenantId: tenant.id,
    channelType: "whatsapp",
    from: msg.from,
    phone: msg.from,
    text: msg.text,
    externalMessageId: msg.externalMessageId,
    contactName: msg.contactName,
    source: "whatsapp",
  });
  if (stored.status !== "stored") return NextResponse.json({ skipped: stored.status });

  const { contact, conversation } = stored;
  if (conversation.aiMode === "auto") {
    after(async () => {
      try {
        await replyWithAssistant({
          tenantId: tenant.id,
          conversation,
          contactName: contact.displayName,
          send: async (text) => {
            const send = await sendAisensyText({ to: msg.from, text });
            if (send.ok) await logWhatsappUsage(tenant.id, 1);
            return send;
          },
        });
      } catch (error) {
        console.error("WhatsApp assistant reply failed", error);
      }
    });
  }

  return NextResponse.json({ ok: true, conversationId: conversation.id });
}
