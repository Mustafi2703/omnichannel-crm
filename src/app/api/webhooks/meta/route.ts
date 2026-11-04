import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchMetaLead, fetchMetaName, parseMetaWebhook, sendMetaReply, verifyMetaSignature, type MetaInbound, type MetaLeadEvent } from "@/lib/meta";
import { replyWithAssistant, storeInboundMessage } from "@/lib/inbound";
import { runAutomations } from "@/lib/automation";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/** Meta's subscription check: echo hub.challenge when the verify token matches. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const token = process.env.META_VERIFY_TOKEN;
  if (!token || params.get("hub.mode") !== "subscribe" || params.get("hub.verify_token") !== token) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return new Response(params.get("hub.challenge") || "", { headers: { "Content-Type": "text/plain" } });
}

// Messages and comments are stored before responding; assistant replies, names and lead-form answers
// come from the Graph API afterwards so Meta gets its 200 quickly.
export async function POST(req: Request) {
  const limit = await rateLimit(`meta:${clientIp(req)}`, 600);
  if (!limit.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  const raw = await req.text();
  if (!verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { messages, leads } = parseMetaWebhook(payload);
  if (!messages.length && !leads.length) return NextResponse.json({ ignored: true });

  const tenantSlug = process.env.DEFAULT_TENANT_SLUG || "demo-sirket";
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) return NextResponse.json({ error: "Tenant missing" }, { status: 404 });

  const stored: (Extract<Awaited<ReturnType<typeof storeInboundMessage>>, { status: "stored" }> & { m: MetaInbound })[] = [];
  for (const m of messages) {
    const result = await storeInboundMessage({
      tenantId: tenant.id,
      channelType: m.channelType,
      from: m.from,
      text: m.text,
      externalMessageId: m.externalMessageId,
      contactName: m.contactName,
      source: m.channelType.startsWith("instagram") ? "instagram" : "facebook",
      // Comments get public replies, so the assistant stays off until the client's comment rules are agreed.
      aiMode: m.channelType.endsWith("_comment") ? "off" : "auto",
    });
    if (result.status === "stored") stored.push({ ...result, m });
  }

  after(async () => {
    for (const { contact, conversation, m } of stored) {
      try {
        let contactName = contact.displayName;
        if (contactName === m.from && (m.channelType === "messenger" || m.channelType === "instagram")) {
          const name = await fetchMetaName(m.channelType, m.from);
          if (name) contactName = (await prisma.contact.update({ where: { id: contact.id }, data: { displayName: name } })).displayName;
        }
        if (conversation.aiMode === "auto") {
          await replyWithAssistant({
            tenantId: tenant.id,
            conversation,
            contactName,
            send: (text) => sendMetaReply(m.channelType, { to: m.from, replyToId: m.externalMessageId, text }),
          });
        }
      } catch (error) {
        console.error("Meta assistant reply failed", error);
      }
    }
    for (const lead of leads) {
      try {
        await saveMetaLead(tenant.id, lead);
      } catch (error) {
        console.error("Meta lead save failed", error);
      }
    }
  });

  return NextResponse.json({ ok: true, stored: stored.length, leads: leads.length });
}

/** Turns a Lead Ads submission into a contact and a lead in the first pipeline stage (one lead per contact, like the widget). */
async function saveMetaLead(tenantId: string, event: MetaLeadEvent) {
  const seen = await prisma.lead.findFirst({ where: { tenantId, qualification: { path: ["metaLeadgenId"], equals: event.leadgenId } } });
  if (seen) return;
  const submission = await fetchMetaLead(event.leadgenId);
  if (!submission) return;

  const { fields } = submission;
  const phone = (fields.phone_number || "").replace(/\D/g, "") || undefined;
  const email = fields.email?.trim().toLowerCase() || undefined;
  const name = fields.full_name || [fields.first_name, fields.last_name].filter(Boolean).join(" ") || phone || email || "Meta lead";
  const source = submission.platform === "ig" ? "instagram" : "facebook";
  const identities = [...(phone ? [{ type: "phone", value: phone }] : []), ...(email ? [{ type: "email", value: email }] : [])];

  const known = identities.length
    ? await prisma.contactIdentity.findFirst({ where: { tenantId, OR: identities }, include: { contact: true } })
    : null;
  const contact =
    known?.contact ||
    (await prisma.contact.create({
      data: {
        tenantId,
        displayName: name,
        phone,
        email,
        source,
        consentWhatsappMarketing: false,
        identities: { create: identities.map((identity) => ({ tenantId, ...identity })) },
      },
    }));

  if (await prisma.lead.findFirst({ where: { tenantId, contactId: contact.id } })) return;
  const stage = await prisma.pipelineStage.findFirst({ where: { tenantId, isWon: false, isLost: false }, orderBy: { position: "asc" } });
  if (!stage) return;
  const lead = await prisma.lead.create({
    data: {
      tenantId,
      contactId: contact.id,
      stageId: stage.id,
      title: `${name} — Meta form`,
      source,
      score: 30,
      tags: ["meta_lead_form"],
      qualification: { ...fields, metaLeadgenId: event.leadgenId, formId: event.formId, adId: event.adId },
    },
  });
  await runAutomations(tenantId, "lead_qualified", { leadId: lead.id, contactId: contact.id });
}
