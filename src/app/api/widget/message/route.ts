import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateBotReply, isOptOutMessage, logAiUsage } from "@/lib/ai";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { runAutomations } from "@/lib/automation";
import { corsHeaders, normaliseOriginList } from "@/lib/widget-cors";

function resolveAllowedOrigins(tenantSettings: { widgetAllowedOrigins?: string[] }) {
  const fromTenant = normaliseOriginList(tenantSettings.widgetAllowedOrigins);
  const fromEnv = normaliseOriginList((process.env.WIDGET_ALLOWED_ORIGINS || "").split(","));
  // Prefer tenant list when set; always include env list as fallback for CRM demo origins.
  return fromTenant.length ? [...new Set([...fromTenant, ...fromEnv])] : fromEnv;
}

async function honourOptOut(params: {
  tenantId: string;
  contactId: string;
  conversationId: string;
}) {
  const negative = await prisma.pipelineStage.findFirst({
    where: { tenantId: params.tenantId, OR: [{ key: "negative" }, { isLost: true }] },
    orderBy: { position: "asc" },
  });
  await prisma.contact.update({
    where: { id: params.contactId },
    data: { consentWhatsappMarketing: false, automationPausedAt: new Date() },
  });
  await prisma.conversation.update({
    where: { id: params.conversationId },
    data: { aiMode: "off", status: "closed", handoffAt: new Date(), unassignedAt: null },
  });
  if (negative) {
    const lead = await prisma.lead.findFirst({ where: { tenantId: params.tenantId, contactId: params.contactId } });
    if (lead) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { stageId: negative.id, lostReason: lead.lostReason || "Customer requested no contact" },
      });
    }
  }
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  let bodyJson: unknown;
  try {
    bodyJson = await req.json();
  } catch {
    return apiError(400, "VALIDATION_ERROR", "Invalid JSON body");
  }

  const limit = await rateLimit(`widget:${clientIp(req)}`, 20);
  if (!limit.ok) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests" } },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const parsed = z
    .object({
      tenantSlug: z.string().max(100).optional(),
      publicKey: z.string().max(100).nullish(),
      text: z.string().trim().min(1).max(10_000),
      visitorId: z.string().max(120).optional(),
      name: z.string().max(160).optional(),
      phone: z.string().max(40).optional(),
      locale: z.enum(["tr", "en"]).optional(),
      utm: z.record(z.string(), z.string().max(500)).optional(),
    })
    .safeParse(bodyJson);
  if (!parsed.success) return apiError(400, "VALIDATION_ERROR", "A message is required");

  const body = parsed.data;
  const slug = body.tenantSlug || "demo-sirket";
  const text = body.text;
  const visitorId = body.visitorId || `web-${Date.now()}`;
  const name = body.name?.trim() || "Web Visitor";
  const locale = body.locale || "tr";
  const utm = body.utm || {};

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Tenant not found" } }, { status: 404 });
  }

  const tenantSettings = tenant.settings as { widgetPublicKey?: string; widgetAllowedOrigins?: string[] };
  const storedKey = tenantSettings.widgetPublicKey;
  const publicKey = body.publicKey || undefined;
  if (storedKey && publicKey !== storedKey) {
    const allowed = resolveAllowedOrigins(tenantSettings);
    return NextResponse.json(
      { error: { code: "INVALID_WIDGET_KEY", message: "Invalid widget key" } },
      { status: 403, headers: corsHeaders(origin, allowed) },
    );
  }

  const allowedOrigins = resolveAllowedOrigins(tenantSettings);
  if (origin && allowedOrigins.length && !allowedOrigins.includes(origin)) {
    return NextResponse.json(
      { error: { code: "ORIGIN_NOT_ALLOWED", message: "This domain is not allowed for the widget" } },
      { status: 403, headers: corsHeaders(origin, allowedOrigins) },
    );
  }
  const headers = corsHeaders(origin, allowedOrigins);

  const identity = await prisma.contactIdentity.findUnique({
    where: { tenantId_type_value: { tenantId: tenant.id, type: "web_visitor_id", value: visitorId } },
    include: { contact: true },
  });

  let contact = identity?.contact;
  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        tenantId: tenant.id,
        displayName: name,
        phone: body.phone || undefined,
        source: utm.gclid || utm.utm_source === "google" ? "google_ads" : "website",
        utmSource: utm.utm_source,
        utmMedium: utm.utm_medium,
        utmCampaign: utm.utm_campaign,
        gclid: utm.gclid,
        landingUrl: utm.landing_url,
        identities: { create: { tenantId: tenant.id, type: "web_visitor_id", value: visitorId } },
      },
    });
  } else if ((body.name && contact.displayName === "Web Visitor") || body.phone) {
    contact = await prisma.contact.update({
      where: { id: contact.id },
      data: {
        ...(body.name && contact.displayName === "Web Visitor" ? { displayName: body.name.trim() } : {}),
        ...(body.phone && !contact.phone ? { phone: body.phone } : {}),
      },
    });
  }

  let conversation = await prisma.conversation.findFirst({
    where: {
      tenantId: tenant.id,
      contactId: contact.id,
      channelType: "website",
      status: { in: ["open", "pending"] },
    },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        tenantId: tenant.id,
        contactId: contact.id,
        channelType: "website",
        aiMode: "auto",
        unassignedAt: new Date(),
      },
    });
  }

  await prisma.message.create({
    data: {
      tenantId: tenant.id,
      conversationId: conversation.id,
      direction: "inbound",
      senderType: "contact",
      bodyText: text,
    },
  });

  if (isOptOutMessage(text)) {
    const reply =
      locale === "tr"
        ? "İsteğinizi kaydettim. Sizinle bir daha iletişime geçmeyeceğiz. İyi günler dilerim."
        : "I have recorded your request. We will not contact you again. Take care.";
    await honourOptOut({ tenantId: tenant.id, contactId: contact.id, conversationId: conversation.id });
    await prisma.message.create({
      data: {
        tenantId: tenant.id,
        conversationId: conversation.id,
        direction: "outbound",
        senderType: "system",
        bodyText: reply,
        aiMeta: { model: "opt-out" },
      },
    });
    return NextResponse.json({ reply, handoff: false, visitorId, conversationId: conversation.id, optOut: true }, { headers });
  }

  let reply =
    locale === "tr" ? "Mesajınız alındı. Kısa süre içinde dönüş yapacağız." : "Thanks — we received your message.";
  let handoff = false;
  let aiMeta: object | undefined;

  if (conversation.aiMode === "auto") {
    const history = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 12,
    });
    const ai = await generateBotReply({
      tenantId: tenant.id,
      contactName: contact.displayName,
      channelType: "website",
      locale,
      history: history.map((m) => ({
        role: m.direction === "inbound" ? "user" : "assistant",
        content: m.bodyText,
      })),
    });
    reply = ai.reply;
    handoff = ai.handoff;
    aiMeta = {
      model: ai.usedModel,
      latencyMs: ai.latencyMs,
      sources: (ai.sources || []).map((source) => ({
        documentId: source.documentId,
        title: source.title,
        score: source.score,
      })),
    };
    await logAiUsage({
      tenantId: tenant.id,
      tokensIn: ai.tokensIn,
      tokensOut: ai.tokensOut,
      model: ai.usedModel,
    });

    if (ai.qualification?.optOut === "true") {
      await honourOptOut({ tenantId: tenant.id, contactId: contact.id, conversationId: conversation.id });
      handoff = false;
    } else {
      const defaultStage = await prisma.pipelineStage.findFirst({
        where: { tenantId: tenant.id, isWon: false, isLost: false },
        orderBy: { position: "asc" },
      });
      const handoffStage =
        (await prisma.pipelineStage.findFirst({
          where: { tenantId: tenant.id, key: { in: ["unassigned", "assigned", "new_lead"] }, isWon: false, isLost: false },
          orderBy: { position: "asc" },
        })) || defaultStage;

      const stage = handoff ? handoffStage : defaultStage;
      if (stage) {
        const existing = await prisma.lead.findFirst({ where: { tenantId: tenant.id, contactId: contact.id } });
        if (!existing) {
          const lead = await prisma.lead.create({
            data: {
              tenantId: tenant.id,
              contactId: contact.id,
              stageId: stage.id,
              title: `${contact.displayName} — web`,
              source: contact.source,
              score: 30 + (ai.scoreDelta || 0),
              qualification: ai.qualification || {},
            },
          });
          if (handoff) {
            await runAutomations(tenant.id, "lead_qualified", {
              leadId: lead.id,
              contactId: contact.id,
              conversationId: conversation.id,
            });
          }
        } else if (handoff && existing.stageId !== stage.id) {
          const current = await prisma.pipelineStage.findFirst({ where: { id: existing.stageId } });
          if (current && !current.isWon && !current.isLost) {
            await prisma.lead.update({ where: { id: existing.id }, data: { stageId: stage.id } });
          }
        }
      }

      if (handoff) {
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
  }

  await prisma.message.create({
    data: {
      tenantId: tenant.id,
      conversationId: conversation.id,
      direction: "outbound",
      senderType: handoff ? "system" : "bot",
      bodyText: reply,
      aiMeta,
    },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });

  return NextResponse.json(
    {
      reply,
      handoff,
      visitorId,
      conversationId: conversation.id,
      sources: (aiMeta as { sources?: unknown } | undefined)?.sources || [],
    },
    { headers },
  );
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin") || "";
  const slug = new URL(req.url).searchParams.get("tenant") || process.env.DEFAULT_TENANT_SLUG || "";
  let allowed = normaliseOriginList((process.env.WIDGET_ALLOWED_ORIGINS || "").split(","));
  if (slug) {
    const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { settings: true } });
    if (tenant) allowed = resolveAllowedOrigins(tenant.settings as { widgetAllowedOrigins?: string[] });
  }
  return new Response(null, { status: 204, headers: corsHeaders(origin, allowed) });
}
