import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { fromApiError } from "@/lib/api";
export async function GET() { try { const s = await requireSession(); const users = await prisma.user.findMany({ where: { tenantId: s.tenantId, isActive: true }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" } }); return NextResponse.json({ users }); } catch (e) { return fromApiError(e); } }
