import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fromApiError, paginationSchema, taskInputSchema } from "@/lib/api";

export async function GET(req: Request) { try { const session = await requireSession(); const { page, pageSize } = paginationSchema.parse(Object.fromEntries(new URL(req.url).searchParams)); const where = { tenantId: session.tenantId }; const [tasks, total] = await prisma.$transaction([prisma.task.findMany({ where, include: { lead: { include: { contact: true } }, contact: true, conversation: true, assignee: { select: { id: true, name: true } } }, orderBy: [{ status: "asc" }, { dueAt: "asc" }], skip: (page - 1) * pageSize, take: pageSize }), prisma.task.count({ where })]); return NextResponse.json({ tasks, pagination: { page, pageSize, total } }); } catch (error) { return fromApiError(error); } }
export async function POST(req: Request) { try { const session = await requireSession(); const input = taskInputSchema.parse(await req.json()); const task = await prisma.task.create({ data: { ...input, tenantId: session.tenantId } }); await audit({ tenantId: session.tenantId, actorUserId: session.id, action: "create", entityType: "task", entityId: task.id, after: { title: task.title } }); return NextResponse.json({ task }, { status: 201 }); } catch (error) { return fromApiError(error); } }
