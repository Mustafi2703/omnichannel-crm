import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fromApiError } from "@/lib/api";
import { normaliseOriginList } from "@/lib/widget-cors";

const input = z.object({
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  welcomeTr: z.string().max(300).optional(),
  welcomeEn: z.string().max(300).optional(),
  widgetAllowedOrigins: z.array(z.string().max(500)).max(20).optional(),
});
export async function GET() {
  try {
    const s = await requireRole("OWNER", "ADMIN");
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: s.tenantId }, select: { slug: true, settings: true } });
    return NextResponse.json({ tenant });
  } catch (e) {
    return fromApiError(e);
  }
}
export async function PATCH(req: Request) {
  try {
    const s = await requireRole("OWNER", "ADMIN");
    const next = input.parse(await req.json());
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: s.tenantId }, select: { settings: true } });
    const normalised = next.widgetAllowedOrigins ? normaliseOriginList(next.widgetAllowedOrigins) : undefined;
    if (next.widgetAllowedOrigins && normalised && normalised.length !== next.widgetAllowedOrigins.filter(Boolean).length) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Origins must be valid http(s) URLs like https://www.example.com (no path)" } },
        { status: 400 },
      );
    }
    const settings = {
      ...(tenant.settings as object),
      ...next,
      ...(normalised ? { widgetAllowedOrigins: normalised } : {}),
    };
    await prisma.tenant.update({ where: { id: s.tenantId }, data: { settings } });
    return NextResponse.json({ settings });
  } catch (e) {
    return fromApiError(e);
  }
}
export async function POST() {
  try {
    const s = await requireRole("OWNER", "ADMIN");
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: s.tenantId }, select: { settings: true } });
    const settings = { ...(tenant.settings as object), widgetPublicKey: `owpk_${crypto.randomUUID().replaceAll("-", "")}` };
    await prisma.tenant.update({ where: { id: s.tenantId }, data: { settings } });
    return NextResponse.json({ settings });
  } catch (e) {
    return fromApiError(e);
  }
}
