import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fromApiError, idSchema, taskInputSchema } from "@/lib/api";

type Context = { params: Promise<{ id: string }> };
const updateSchema = taskInputSchema.partial().extend({ status: z.enum(["open", "done", "cancelled"]).optional() });
export async function PATCH(req: Request, ctx: Context) { try { const session = await requireSession(); const id = idSchema.parse((await ctx.params).id); const input = updateSchema.parse(await req.json()); const before = await prisma.task.findFirst({ where: { id, tenantId: session.tenantId } }); if (!before) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Task not found" } }, { status: 404 }); const resetDueNotification = input.dueAt !== undefined || (input.status === "open" && before.status !== "open"); const task = await prisma.task.update({ where: { id }, data: { ...input, completedAt: input.status === "done" ? new Date() : input.status ? null : undefined, dueNotifiedAt: resetDueNotification ? null : undefined } }); await audit({ tenantId: session.tenantId, actorUserId: session.id, action: "update", entityType: "task", entityId: id, before: { status: before.status }, after: { status: task.status } }); return NextResponse.json({ task }); } catch (error) { return fromApiError(error); } }
export async function DELETE(_req: Request, ctx: Context) { try { const session = await requireSession(); const id = idSchema.parse((await ctx.params).id); const result = await prisma.task.deleteMany({ where: { id, tenantId: session.tenantId } }); if (!result.count) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Task not found" } }, { status: 404 }); await audit({ tenantId: session.tenantId, actorUserId: session.id, action: "delete", entityType: "task", entityId: id }); return NextResponse.json({ ok: true }); } catch (error) { return fromApiError(error); } }
