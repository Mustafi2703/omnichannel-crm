import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { corsHeaders, normaliseOriginList } from "@/lib/widget-cors";

function resolveAllowedOrigins(tenantSettings: { widgetAllowedOrigins?: string[] }) {
  const fromTenant = normaliseOriginList(tenantSettings.widgetAllowedOrigins);
  const fromEnv = normaliseOriginList((process.env.WIDGET_ALLOWED_ORIGINS || "").split(","));
  return fromTenant.length ? [...new Set([...fromTenant, ...fromEnv])] : fromEnv;
}

/** Visitor poll for adviser replies after handoff (website channel). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("tenant") || "";
  const visitorId = url.searchParams.get("visitorId") || "";
  const publicKey = url.searchParams.get("publicKey") || "";
  const after = url.searchParams.get("after");
  const origin = req.headers.get("origin");

  if (!slug || !visitorId) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "tenant and visitorId are required" } }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Tenant not found" } }, { status: 404 });
  const settings = tenant.settings as { widgetPublicKey?: string; widgetAllowedOrigins?: string[] };
  const allowed = resolveAllowedOrigins(settings);
  const headers = corsHeaders(origin, allowed);
  if (origin && allowed.length && !allowed.includes(origin)) {
    return NextResponse.json({ error: { code: "ORIGIN_NOT_ALLOWED", message: "Origin not allowed" } }, { status: 403, headers });
  }
  if (settings.widgetPublicKey && publicKey !== settings.widgetPublicKey) {
    return NextResponse.json({ error: { code: "INVALID_WIDGET_KEY", message: "Invalid widget key" } }, { status: 403, headers });
  }

  const identity = await prisma.contactIdentity.findUnique({
    where: { tenantId_type_value: { tenantId: tenant.id, type: "web_visitor_id", value: visitorId } },
  });
  if (!identity) return NextResponse.json({ messages: [] }, { headers });

  const conversation = await prisma.conversation.findFirst({
    where: { tenantId: tenant.id, contactId: identity.contactId, channelType: "website", status: { in: ["open", "pending"] } },
    orderBy: { updatedAt: "desc" },
  });
  if (!conversation) return NextResponse.json({ messages: [] }, { headers });

  const messages = await prisma.message.findMany({
    where: {
      conversationId: conversation.id,
      direction: "outbound",
      senderType: { in: ["agent", "system"] },
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { id: true, bodyText: true, createdAt: true, senderType: true },
  });

  if (messages.length) {
    await prisma.message.updateMany({
      where: { id: { in: messages.map((m) => m.id) }, deliveryStatus: { in: ["sent", "pending_visitor", "queued"] } },
      data: { deliveryStatus: "delivered" },
    });
  }

  return NextResponse.json(
    {
      conversationId: conversation.id,
      messages: messages.map((m) => ({ id: m.id, text: m.bodyText, at: m.createdAt.toISOString(), senderType: m.senderType })),
    },
    { headers },
  );
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin") || "";
  const slug = new URL(req.url).searchParams.get("tenant") || "";
  let allowed = normaliseOriginList((process.env.WIDGET_ALLOWED_ORIGINS || "").split(","));
  if (slug) {
    const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { settings: true } });
    if (tenant) allowed = resolveAllowedOrigins(tenant.settings as { widgetAllowedOrigins?: string[] });
  }
  return new Response(null, { status: 204, headers: corsHeaders(origin, allowed) });
}
