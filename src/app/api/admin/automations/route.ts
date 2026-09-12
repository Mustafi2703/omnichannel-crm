import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fromApiError } from "@/lib/api";
import { Prisma } from "@prisma/client";
const schema = z.object({ name: z.string().min(1).max(120), trigger: z.enum(["lead_qualified", "conversation_unassigned", "task_overdue", "sla_no_reply"]), action: z.enum(["assign_user", "add_tag", "notify"]), config: z.record(z.string(), z.unknown()).default({}), isActive: z.boolean().default(true) });
export async function GET() { try { const session = await requireRole("OWNER", "ADMIN"); const rules = await prisma.automationRule.findMany({ where: { tenantId: session.tenantId }, include: { runs: { take: 10, orderBy: { createdAt: "desc" } } } }); return NextResponse.json({ rules }); } catch (error) { return fromApiError(error); } }
export async function POST(req: Request) { try { const session = await requireRole("OWNER", "ADMIN"); const input = schema.parse(await req.json()); const rule = await prisma.automationRule.create({ data: { ...input, config: input.config as Prisma.InputJsonValue, tenantId: session.tenantId } }); return NextResponse.json({ rule }, { status: 201 }); } catch (error) { return fromApiError(error); } }
