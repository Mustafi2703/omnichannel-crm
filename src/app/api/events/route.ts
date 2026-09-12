import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { fromApiError, idSchema } from "@/lib/api";

const input = z.object({ title: z.string().trim().min(1).max(200), description: z.string().max(4000).nullable().optional(), startsAt: z.coerce.date(), endsAt: z.coerce.date().nullable().optional(), reminderAt: z.coerce.date().nullable().optional(), leadId: idSchema.nullable().optional(), contactId: idSchema.nullable().optional(), conversationId: idSchema.nullable().optional(), ownerUserId: idSchema.nullable().optional() });
export async function GET(req: Request) { try { const s = await requireSession(); const from = new URL(req.url).searchParams.get("from"); const to = new URL(req.url).searchParams.get("to"); const events = await prisma.calendarEvent.findMany({ where: { tenantId: s.tenantId, ...(from || to ? { startsAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}) }, include: { lead: true, contact: true, owner: { select: { id: true, name: true } } }, orderBy: { startsAt: "asc" } }); return NextResponse.json({ events }); } catch (e) { return fromApiError(e); } }
export async function POST(req: Request) { try { const s = await requireSession(); const data = input.parse(await req.json()); const event = await prisma.calendarEvent.create({ data: { ...data, tenantId: s.tenantId, ownerUserId: data.ownerUserId || s.id } }); return NextResponse.json({ event }, { status: 201 }); } catch (e) { return fromApiError(e); } }
