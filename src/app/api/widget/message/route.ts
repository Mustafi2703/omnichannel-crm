import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateBotReply, logAiUsage } from "@/lib/ai";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { runAutomations } from "@/lib/automation";

export async function POST(req: Request) {
  const limit = await rateLimit(`widget:${clientIp(req)}`, 20);
  if (!limit.ok) return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many requests" } }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  const parsed = z.object({ tenantSlug: z.string().max(100).optional(), publicKey: z.string().max(100).optional(), text: z.string().trim().min(1).max(10_000), visitorId: z.string().max(120).optional(), name: z.string().max(160).optional(), locale: z.enum(["tr", "en"]).optional(), utm: z.record(z.string(), z.string().max(500)).optional() }).safeParse(await req.json());
  if (!parsed.success) return apiError(400, "VALIDATION_ERROR", "A message is required");
  const body = parsed.data;
  const slug = body.tenantSlug || "demo-sirket";
  const text = body.text;
  const visitorId = body.visitorId || `web-${Date.now()}`;
  const name = body.name || "Web Visitor";
  const locale = body.locale || "tr";
  const utm = body.utm || {};

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  const storedKey = (tenant.settings as { widgetPublicKey?: string }).widgetPublicKey;
  if (storedKey && body.publicKey !== storedKey) return NextResponse.json({ error: { code: "INVALID_WIDGET_KEY", message: "Invalid widget key" } }, { status: 403 });
  const origin = req.headers.get("origin");
  const configuredOrigins = (process.env.WIDGET_ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
  const tenantSettings = tenant.settings as { widgetAllowedOrigins?: string[] };
  const allowedOrigins = tenantSettings.widgetAllowedOrigins?.length ? tenantSettings.widgetAllowedOrigins : configuredOrigins;
  if (origin && allowedOrigins.length && !allowedOrigins.includes(origin)) return NextResponse.json({ error: { code: "ORIGIN_NOT_ALLOWED", message: "This domain is not allowed for the widget" } }, { status: 403 });

  const identity = await prisma.contactIdentity.findUnique({
    where: {
      tenantId_type_value: { tenantId: tenant.id, type: "web_visitor_id", value: visitorId },
    },
    include: { contact: true },
  });

  let contact = identity?.contact;
  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        tenantId: tenant.id,
        displayName: name,
        source: utm.gclid || utm.utm_source === "google" ? "google_ads" : "website",
        utmSource: utm.utm_source,
        utmMedium: utm.utm_medium,
        utmCampaign: utm.utm_campaign,
        gclid: utm.gclid,
        landingUrl: utm.landing_url,
        identities: {
          create: { tenantId: tenant.id, type: "web_visitor_id", value: visitorId },
        },
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

  let reply =
    locale === "tr"
      ? "Mesajınız alındı. Kısa süre içinde dönüş yapacağız."
      : "Thanks — we received your message.";
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

    const newStage = await prisma.pipelineStage.findFirst({
      where: { tenantId: tenant.id, key: handoff ? "qualified" : "new" },
    });
    if (newStage) {
      const existing = await prisma.lead.findFirst({
        where: { tenantId: tenant.id, contactId: contact.id },
      });
      if (!existing) {
        const lead = await prisma.lead.create({
          data: {
            tenantId: tenant.id,
            contactId: contact.id,
            stageId: newStage.id,
            title: `${contact.displayName} — web`,
            source: contact.source,
            score: 30 + (ai.scoreDelta || 0),
            qualification: ai.qualification || {},
          },
        });
        if (handoff) await runAutomations(tenant.id, "lead_qualified", { leadId: lead.id, contactId: contact.id, conversationId: conversation.id });
      }
    }

    if (handoff) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { aiMode: "off", handoffAt: new Date(), status: "pending" },
      });
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

  return NextResponse.json({
    reply,
    handoff,
    visitorId,
    conversationId: conversation.id,
    sources: (aiMeta as { sources?: unknown } | undefined)?.sources || [],
  }, { headers: origin && allowedOrigins.includes(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {} });
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = (process.env.WIDGET_ALLOWED_ORIGINS || "").split(",").map((value) => value.trim());
  return new Response(null, { status: 204, headers: allowed.includes(origin) ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" } : {} });
}
