import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fromApiError } from "@/lib/api";
const input = z.object({ name: z.string().trim().regex(/^[a-z0-9_]+$/).max(100), language: z.string().max(10).default("tr"), category: z.enum(["marketing", "utility", "authentication"]).default("marketing"), body: z.string().trim().min(1).max(4096), variables: z.array(z.string().max(80)).max(20).default([]), buttons: z.array(z.object({ type: z.string().max(30), text: z.string().max(60), url: z.string().max(500).optional() })).max(3).default([]), status: z.enum(["draft", "approved", "rejected"]).default("draft"), rejectionReason: z.string().max(500).optional() });
export async function GET() { try { const s = await requireRole("OWNER", "ADMIN"); return NextResponse.json({ templates: await prisma.whatsappTemplate.findMany({ where: { tenantId: s.tenantId }, orderBy: { updatedAt: "desc" } }) }); } catch (e) { return fromApiError(e); } }
export async function POST(req: Request) { try { const s = await requireRole("OWNER", "ADMIN"); const data = input.parse(await req.json()); const template = await prisma.whatsappTemplate.create({ data: { ...data, variables: data.variables as Prisma.InputJsonValue, buttons: data.buttons as Prisma.InputJsonValue, ownerUserId: s.id, tenantId: s.tenantId } }); return NextResponse.json({ template }, { status: 201 }); } catch (e) { return fromApiError(e); } }
