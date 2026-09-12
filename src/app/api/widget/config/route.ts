import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("tenant") || "";
  const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { name: true, slug: true, settings: true } });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const settings = tenant.settings as { brandColor?: string; welcomeTr?: string; welcomeEn?: string; widgetPublicKey?: string; widgetAllowedOrigins?: string[] };
  const origin = req.headers.get("origin");
  const configuredOrigins = (process.env.WIDGET_ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
  const allowedOrigins = settings.widgetAllowedOrigins?.length ? settings.widgetAllowedOrigins : configuredOrigins;
  const headers: Record<string, string> = origin && allowedOrigins.includes(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {};
  return NextResponse.json({ tenant: { name: tenant.name, slug: tenant.slug, settings: { brandColor: settings.brandColor, welcomeTr: settings.welcomeTr, welcomeEn: settings.welcomeEn } } }, { headers });
}
