import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fromApiError } from "@/lib/api";

const input = z.object({ brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(), welcomeTr: z.string().max(300).optional(), welcomeEn: z.string().max(300).optional(), widgetAllowedOrigins: z.array(z.string().url().max(500)).max(20).optional() });
export async function GET() { try { const s = await requireRole("OWNER", "ADMIN"); const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: s.tenantId }, select: { slug: true, settings: true } }); return NextResponse.json({ tenant }); } catch (e) { return fromApiError(e); } }
export async function PATCH(req: Request) { try { const s = await requireRole("OWNER", "ADMIN"); const next = input.parse(await req.json()); const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: s.tenantId }, select: { settings: true } }); const settings = { ...(tenant.settings as object), ...next }; await prisma.tenant.update({ where: { id: s.tenantId }, data: { settings } }); return NextResponse.json({ settings }); } catch (e) { return fromApiError(e); } }
export async function POST() { try { const s = await requireRole("OWNER", "ADMIN"); const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: s.tenantId }, select: { settings: true } }); const settings = { ...(tenant.settings as object), widgetPublicKey: `owpk_${crypto.randomUUID().replaceAll("-", "")}` }; await prisma.tenant.update({ where: { id: s.tenantId }, data: { settings } }); return NextResponse.json({ settings }); } catch (e) { return fromApiError(e); } }
