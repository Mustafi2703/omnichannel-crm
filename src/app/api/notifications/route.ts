import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { fromApiError } from "@/lib/api";
export async function GET() { try { const session = await requireSession(); const notifications = await prisma.notification.findMany({ where: { tenantId: session.tenantId, OR: [{ userId: session.id }, { userId: null }] }, orderBy: { createdAt: "desc" }, take: 50 }); return NextResponse.json({ notifications }); } catch (error) { return fromApiError(error); } }
export async function PATCH(req: Request) { try { const session = await requireSession(); const body = await req.json() as { id?: string }; await prisma.notification.updateMany({ where: { id: body.id, tenantId: session.tenantId, OR: [{ userId: session.id }, { userId: null }] }, data: { readAt: new Date() } }); return NextResponse.json({ ok: true }); } catch (error) { return fromApiError(error); } }
